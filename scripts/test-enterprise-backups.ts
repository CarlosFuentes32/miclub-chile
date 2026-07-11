import { BackupStatus, BackupType, RestoreStatus, RollbackStatus } from "@prisma/client";
import { BackupsService } from "../backend/api/src/backups/backups.service";

type Env = Record<string, string | undefined>;

class FakeConfig {
  constructor(private readonly env: Env) {}
  get<T = string>(key: string, fallback?: T): T {
    return (this.env[key] ?? fallback) as T;
  }
}

class FakeModel<T extends { id: string; createdAt?: Date; updatedAt?: Date; startedAt?: Date }> {
  rows: T[] = [];
  constructor(private readonly name: string) {}
  async create(args: any) {
    const now = new Date();
    const row = { id: `${this.name}-${this.rows.length + 1}`, createdAt: now, updatedAt: now, ...args.data } as T;
    this.rows.push(row);
    return row;
  }
  async update(args: any) {
    const row = this.rows.find((item) => item.id === args.where.id);
    if (!row) throw new Error(`${this.name} not found`);
    Object.assign(row, args.data, { updatedAt: new Date() });
    return row;
  }
  async findFirst(args: any = {}) {
    const rows = await this.findMany({ ...args, take: undefined });
    return rows[0] ?? null;
  }
  async findUnique(args: any = {}) {
    return this.rows.find((item) => item.id === args.where.id) ?? null;
  }
  async findMany(args: any = {}) {
    let rows = [...this.rows];
    if (args.orderBy?.startedAt === "desc") rows.sort((a: any, b: any) => b.startedAt.getTime() - a.startedAt.getTime());
    if (args.orderBy?.createdAt === "desc") rows.sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime());
    if (args.take) rows = rows.slice(0, args.take);
    return rows;
  }
}

class FakePrisma {
  backupRecord = new FakeModel<any>("backup");
  restoreRecord = new FakeModel<any>("restore");
  rollbackPlan = new FakeModel<any>("rollback");
  failIntegrity = false;
  failAfterIdentity = false;
  emptyDatabase = false;

  async $queryRawUnsafe(sql: string) {
    if (sql.includes("current_database()")) {
      return [{ database: "miclub_staging", user_name: "staging_user", host: "127.0.0.1" }];
    }
    if (this.failIntegrity || this.failAfterIdentity) throw new Error("database unavailable");
    if (sql.includes("_prisma_migrations") && sql.includes("ORDER BY")) {
      return [
        { migration_name: "202607110002_enterprise_backups", finished_at: new Date() },
        { migration_name: "202607110001_enterprise_incidents", finished_at: new Date() },
      ];
    }
    if (sql.includes("LEFT JOIN")) {
      return [{ count: 0 }];
    }
    if (sql.includes("COUNT(*)")) {
      return [{ count: this.emptyDatabase ? 0 : 3 }];
    }
    return [];
  }
}

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

function service(env: Env = {}, prisma = new FakePrisma()) {
  return {
    prisma,
    svc: new BackupsService(
      prisma as any,
      new FakeConfig({
        APP_ENV: "staging",
        NODE_ENV: "staging",
        APP_VERSION: "1.1.0-test",
        RAILWAY_GIT_COMMIT_SHA: "71eafaa32ec83e4b8bb6d897fa28396430b7e8a6",
        RAILWAY_GIT_BRANCH: "fix/mvp-comercial-readiness",
        ...env,
      }) as any,
    ),
  };
}

async function run() {
  const actor = { id: "admin-1", name: "QA Admin", email: "qa@miclubchile.cl" };

  const ok = service();
  const backup = await ok.svc.createBackup({ type: BackupType.MANUAL, reason: "qa backup" }, actor);
  assert(backup.status === BackupStatus.VERIFIED, "Backup correcto debe quedar VERIFIED");
  assert(Boolean(backup.checksum), "Backup debe tener checksum");
  assert((backup.validation as any).ok === true, "Backup debe incluir validación OK");

  const restore = await ok.svc.createRestoreDrill({
    backupId: backup.id,
    targetEnvironment: "temporary",
    temporaryDatabaseRef: "qa-temp-db",
    confirmedTemporaryRestore: true,
    reason: "qa restore",
  }, actor);
  assert(restore.status === RestoreStatus.VALIDATED, "Restore correcto debe quedar VALIDATED");

  const blockedRestore = await ok.svc.createRestoreDrill({
    backupId: backup.id,
    targetEnvironment: "production",
    reason: "should block",
  }, actor);
  assert(blockedRestore.status === RestoreStatus.BLOCKED, "Restore directo a producción debe bloquearse");

  const rollback = await ok.svc.createRollbackPlan({
    reason: "qa rollback",
    backupId: backup.id,
    includeDatabase: true,
    includeVariables: true,
    toCommit: "71eafaa",
  }, actor);
  assert(rollback.status === RollbackStatus.VALIDATED, "Rollback con backup debe validarse");

  const blockedRollback = await ok.svc.createRollbackPlan({
    reason: "missing backup",
    includeDatabase: true,
    toCommit: "71eafaa",
  }, actor);
  assert(blockedRollback.status === RollbackStatus.BLOCKED, "Rollback de DB sin backup debe bloquearse");

  const failedPrisma = new FakePrisma();
  failedPrisma.failAfterIdentity = true;
  const failed = service({}, failedPrisma);
  const failedBackup = await failed.svc.createBackup({ type: BackupType.SCHEDULED, reason: "fail" }, actor);
  assert(failedBackup.status === BackupStatus.FAILED, "Backup fallido debe quedar FAILED");

  const emptyPrisma = new FakePrisma();
  emptyPrisma.emptyDatabase = true;
  const empty = service({}, emptyPrisma);
  const emptyValidation = await empty.svc.validateDatabaseIntegrity();
  assert(emptyValidation.ok === true, "Base vacía controlada debe poder validarse estructuralmente");
  assert(emptyValidation.tables.users === 0, "Debe reportar conteos cero");

  const prod = service({ APP_ENV: "production", NODE_ENV: "production" });
  await prod.svc.simulate(actor)
    .then(() => {
      throw new Error("Simulación no debe permitirse en producción");
    })
    .catch((error) => {
      assert(error?.status === 400, "Ambiente incorrecto debe bloquear simulación");
    });

  const simulation = await ok.svc.simulate(actor);
  assert(simulation.backup.status === BackupStatus.VERIFIED, "Simulación debe crear backup verificado");
  assert(simulation.restore.status === RestoreStatus.VALIDATED, "Simulación debe validar restore");
  assert(simulation.rollback.status === RollbackStatus.VALIDATED, "Simulación debe validar rollback");

  console.log("OK: backups, restore, rollback, integridad, fallos, base vacía y bloqueo producción verificados");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
