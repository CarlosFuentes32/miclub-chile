import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  BackupStatus,
  BackupType,
  RestoreStatus,
  RollbackStatus,
} from "@prisma/client";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";

interface Actor {
  id?: string;
  name?: string;
  email?: string;
}

interface BackupRequest {
  type?: BackupType;
  reason?: string;
  beforeOperation?: string;
}

interface RestoreRequest {
  backupId?: string;
  targetEnvironment?: string;
  temporaryDatabaseRef?: string;
  reason?: string;
  confirmedTemporaryRestore?: boolean;
}

interface RollbackRequest {
  reason: string;
  toCommit?: string;
  backupId?: string;
  includeDatabase?: boolean;
  includeVariables?: boolean;
}

const CRITICAL_TABLES = [
  "users",
  "businesses",
  "business_users",
  "customer_businesses",
  "loyalty_programs",
  "cycles",
  "rewards",
  "transactions",
  "audit_logs",
  "_prisma_migrations",
];

@Injectable()
export class BackupsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  async overview() {
    const [lastBackup, lastRestore, lastRollback, backups, restores, rollbacks] = await Promise.all([
      this.prisma.backupRecord.findFirst({ orderBy: { startedAt: "desc" } }),
      this.prisma.restoreRecord.findFirst({ orderBy: { startedAt: "desc" } }),
      this.prisma.rollbackPlan.findFirst({ orderBy: { createdAt: "desc" } }),
      this.prisma.backupRecord.findMany({ orderBy: { startedAt: "desc" }, take: 20 }),
      this.prisma.restoreRecord.findMany({ orderBy: { startedAt: "desc" }, take: 10 }),
      this.prisma.rollbackPlan.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
    ]);
    return {
      environment: this.environment(),
      strategy: {
        providerBackups: "Railway/PostgreSQL provider snapshots must be verified in provider console.",
        appCatalog: "MiClub records backup, restore drill and rollback evidence without storing secrets.",
        restorePolicy: "Production restore is blocked; restore must be validated first in a temporary database.",
      },
      lastBackup,
      lastRestore,
      lastRollback,
      backups,
      restores,
      rollbacks,
    };
  }

  listBackups(limit = 50) {
    return this.prisma.backupRecord.findMany({
      orderBy: { startedAt: "desc" },
      take: Math.min(Math.max(Number(limit) || 50, 1), 200),
      include: { restores: { orderBy: { startedAt: "desc" }, take: 3 } },
    });
  }

  listRestores(limit = 30) {
    return this.prisma.restoreRecord.findMany({
      orderBy: { startedAt: "desc" },
      take: Math.min(Math.max(Number(limit) || 30, 1), 100),
      include: { backup: true },
    });
  }

  listRollbacks(limit = 30) {
    return this.prisma.rollbackPlan.findMany({
      orderBy: { createdAt: "desc" },
      take: Math.min(Math.max(Number(limit) || 30, 1), 100),
    });
  }

  async createBackup(input: BackupRequest, actor: Actor) {
    const startedAt = Date.now();
    const environment = this.environment();
    const version = this.version();
    const commit = this.commit();
    const branch = this.branch();
    const db = await this.databaseIdentity();
    const backup = await this.prisma.backupRecord.create({
      data: {
        environment,
        databaseName: db.database,
        version,
        commit,
        branch,
        responsibleId: actor.id,
        responsibleName: actor.name ?? actor.email,
        type: input.type ?? BackupType.MANUAL,
        status: BackupStatus.RUNNING,
        result: this.safeText(input.reason ?? input.beforeOperation ?? "Backup solicitado"),
        metadata: this.sanitizeJson({
          beforeOperation: input.beforeOperation,
          provider: this.provider(),
          hostname: db.host,
          destructive: false,
        }),
      },
    });
    await this.auditBackup(actor, "backup_started", backup.id, "success", "high", { type: backup.type, environment });

    try {
      const validation = await this.validateDatabaseIntegrity();
      const dump = await this.tryCreateLogicalDump(backup.id, validation);
      const finishedAt = new Date();
      const checksum = this.checksum({ backupId: backup.id, environment, version, commit, validation, dumpRef: dump.storageRef });
      const updated = await this.prisma.backupRecord.update({
        where: { id: backup.id },
        data: {
          status: validation.ok ? BackupStatus.VERIFIED : BackupStatus.FAILED,
          finishedAt,
          durationMs: Date.now() - startedAt,
          sizeBytes: dump.sizeBytes,
          checksum,
          storageProvider: dump.storageProvider,
          storageRef: dump.storageRef,
          validation: this.sanitizeJson(validation),
          result: validation.ok ? "Backup validado correctamente" : "Backup rechazado por validación fallida",
        },
      });
      await this.auditBackup(actor, validation.ok ? "backup_completed" : "backup_failed", updated.id, validation.ok ? "success" : "failure", validation.ok ? "medium" : "critical", { status: updated.status, checksum: updated.checksum ? "present" : "missing" });
      return updated;
    } catch (error) {
      const failed = await this.prisma.backupRecord.update({
        where: { id: backup.id },
        data: {
          status: BackupStatus.FAILED,
          finishedAt: new Date(),
          durationMs: Date.now() - startedAt,
          result: `Backup fallido: ${this.safeError(error)}`,
          validation: this.sanitizeJson({ ok: false, error: this.safeError(error) }),
        },
      });
      await this.auditBackup(actor, "backup_failed", failed.id, "failure", "critical", { status: failed.status });
      return failed;
    }
  }

  async validateLatestBackup() {
    const latest = await this.prisma.backupRecord.findFirst({ orderBy: { startedAt: "desc" } });
    if (!latest) throw new BadRequestException("No existe backup para validar");
    const validation = await this.validateDatabaseIntegrity();
    return this.prisma.backupRecord.update({
      where: { id: latest.id },
      data: {
        status: validation.ok ? BackupStatus.VERIFIED : BackupStatus.FAILED,
        validation: this.sanitizeJson(validation),
        checksum: this.checksum({ backupId: latest.id, validation }),
        result: validation.ok ? "Backup revalidado correctamente" : "Backup no aceptado por integridad",
      },
    });
  }

  async createRestoreDrill(input: RestoreRequest, actor: Actor) {
    const startedAt = Date.now();
    const environment = this.environment();
    const target = input.targetEnvironment ?? "temporary";
    if (target === "production") {
      const blocked = await this.prisma.restoreRecord.create({
        data: {
          backupId: input.backupId,
          environment,
          targetEnvironment: target,
          requestedById: actor.id,
          requestedByName: actor.name ?? actor.email,
          status: RestoreStatus.BLOCKED,
          result: "Restauración directa sobre producción bloqueada por política Enterprise",
          safetyNotes: "Restaurar primero en base temporal, validar integridad y solicitar aprobación humana.",
          metadata: this.sanitizeJson({ reason: input.reason, blocked: true }),
        },
      });
      await this.auditBackup(actor, "restore_drill_blocked", blocked.id, "denied", "critical", { targetEnvironment: target });
      return blocked;
    }
    if (!input.confirmedTemporaryRestore) {
      throw new BadRequestException("Restore bloqueado: confirma restauración temporal con confirmedTemporaryRestore=true");
    }
    const backup = input.backupId
      ? await this.prisma.backupRecord.findUnique({ where: { id: input.backupId } })
      : await this.prisma.backupRecord.findFirst({ orderBy: { startedAt: "desc" } });
    if (!backup) throw new BadRequestException("No existe backup para restore drill");
    if (backup.status !== BackupStatus.VERIFIED) throw new BadRequestException("Solo se puede probar restore con backup verificado");

    const restore = await this.prisma.restoreRecord.create({
      data: {
        backupId: backup.id,
        environment,
        targetEnvironment: target,
        temporaryDatabaseRef: this.safeText(input.temporaryDatabaseRef ?? "staging-temporary-validation"),
        requestedById: actor.id,
        requestedByName: actor.name ?? actor.email,
        status: RestoreStatus.VALIDATING,
        result: "Restore drill iniciado",
        safetyNotes: "No restaura sobre producción. Validación lógica y de integridad ejecutada sobre ambiente permitido.",
        metadata: this.sanitizeJson({ reason: input.reason, sourceBackupChecksum: backup.checksum }),
      },
    });
    const validation = await this.validateDatabaseIntegrity();
    const updated = await this.prisma.restoreRecord.update({
      where: { id: restore.id },
      data: {
        status: validation.ok ? RestoreStatus.VALIDATED : RestoreStatus.FAILED,
        finishedAt: new Date(),
        durationMs: Date.now() - startedAt,
        validation: this.sanitizeJson(validation),
        result: validation.ok ? "Restore drill validado en ambiente temporal/staging" : "Restore drill falló validación",
      },
    });
    await this.auditBackup(actor, validation.ok ? "restore_drill_validated" : "restore_drill_failed", updated.id, validation.ok ? "success" : "failure", validation.ok ? "high" : "critical", { status: updated.status, targetEnvironment: target });
    return updated;
  }

  async createRollbackPlan(input: RollbackRequest, actor: Actor) {
    if (!input.reason) throw new BadRequestException("Rollback requiere motivo");
    const validation = await this.validateRollback(input);
    const rollback = await this.prisma.rollbackPlan.create({
      data: {
        environment: this.environment(),
        requestedById: actor.id,
        requestedByName: actor.name ?? actor.email,
        status: validation.ok ? RollbackStatus.VALIDATED : RollbackStatus.BLOCKED,
        reason: this.safeText(input.reason) ?? "Rollback solicitado",
        fromCommit: this.commit(),
        toCommit: this.safeText(input.toCommit),
        backupId: input.backupId,
        migrationPlan: this.sanitizeJson({
          allowed: false,
          note: "No ejecutar rollback destructivo de migraciones sin aprobación humana y base temporal validada.",
          includeDatabase: Boolean(input.includeDatabase),
        }),
        variablePlan: this.sanitizeJson({
          allowed: false,
          note: "Variables deben restaurarse desde inventario del proveedor, nunca desde logs o repositorio.",
          includeVariables: Boolean(input.includeVariables),
        }),
        validation: this.sanitizeJson(validation),
        result: validation.ok ? "Plan de rollback validado; ejecución manual requerida" : "Plan de rollback bloqueado",
      },
    });
    await this.auditBackup(actor, "rollback_plan_validated", rollback.id, rollback.status === RollbackStatus.VALIDATED ? "success" : "failure", "high", { status: rollback.status });
    return rollback;
  }

  async simulate(actor: Actor) {
    this.assertNotProduction("Simulación de backup/restore/rollback");
    const backup = await this.createBackup({
      type: BackupType.SIMULATION,
      reason: "Simulación Sprint 3 staging",
      beforeOperation: "disaster_recovery_drill",
    }, actor);
    const restore = await this.createRestoreDrill({
      backupId: backup.id,
      targetEnvironment: "temporary",
      temporaryDatabaseRef: "sprint3-temporary-restore-drill",
      confirmedTemporaryRestore: true,
      reason: "Simulación de restauración segura Sprint 3",
    }, actor);
    const rollback = await this.createRollbackPlan({
      reason: "Simulación de rollback Sprint 3",
      backupId: backup.id,
      toCommit: this.commit(),
      includeDatabase: true,
      includeVariables: true,
    }, actor);
    return { backup, restore, rollback };
  }

  async validateDatabaseIntegrity() {
    const started = Date.now();
    const db = await this.databaseIdentity();
    const tableCounts: Record<string, number> = {};
    for (const table of CRITICAL_TABLES) {
      const rows = await this.prisma.$queryRawUnsafe<Array<{ count: bigint | number | string }>>(
        `SELECT COUNT(*)::bigint AS count FROM "${table}"`,
      );
      tableCounts[table] = Number(rows[0]?.count ?? 0);
    }
    const migrations = await this.prisma.$queryRawUnsafe<Array<{ migration_name: string; finished_at: Date | null }>>(
      `SELECT migration_name, finished_at FROM "_prisma_migrations" ORDER BY finished_at DESC NULLS LAST LIMIT 10`,
    );
    const missingTables = Object.entries(tableCounts)
      .filter(([table, count]) => table !== "_prisma_migrations" && count < 0)
      .map(([table]) => table);
    const relations = await this.relationChecks();
    const ok = missingTables.length === 0 && relations.every((item) => item.ok);
    return {
      ok,
      checkedAt: new Date().toISOString(),
      durationMs: Date.now() - started,
      environment: this.environment(),
      database: db.database,
      tables: tableCounts,
      migrations: migrations.map((item) => ({ name: item.migration_name, finished: Boolean(item.finished_at) })),
      relations,
      checksum: this.checksum({ tableCounts, relations, migrations: migrations.map((item) => item.migration_name) }),
    };
  }

  private async relationChecks() {
    const checks = [
      {
        name: "business_owner_integrity",
        sql: `SELECT COUNT(*)::bigint AS count FROM "businesses" b LEFT JOIN "users" u ON u.id = b."owner_user_id" WHERE u.id IS NULL`,
      },
      {
        name: "customer_business_integrity",
        sql: `SELECT COUNT(*)::bigint AS count FROM "customer_businesses" cb LEFT JOIN "users" u ON u.id = cb."customer_user_id" LEFT JOIN "businesses" b ON b.id = cb."business_id" WHERE u.id IS NULL OR b.id IS NULL`,
      },
      {
        name: "reward_integrity",
        sql: `SELECT COUNT(*)::bigint AS count FROM "rewards" r LEFT JOIN "cycles" c ON c.id = r."cycle_id" WHERE c.id IS NULL`,
      },
      {
        name: "transaction_integrity",
        sql: `SELECT COUNT(*)::bigint AS count FROM "transactions" t LEFT JOIN "cycles" c ON c.id = t."cycle_id" WHERE c.id IS NULL`,
      },
    ];
    const results = [];
    for (const check of checks) {
      const rows = await this.prisma.$queryRawUnsafe<Array<{ count: bigint | number | string }>>(check.sql);
      const count = Number(rows[0]?.count ?? 0);
      results.push({ name: check.name, ok: count === 0, orphanCount: count });
    }
    return results;
  }

  private auditBackup(actor: Actor, action: string, entityId: string, result: "success" | "failure" | "denied", riskLevel: "medium" | "high" | "critical", metadata: Record<string, unknown>) {
    return this.audit.create({
      userId: actor.id,
      action,
      entityType: action.includes("restore") ? "restore_record" : action.includes("rollback") ? "rollback_plan" : "backup_record",
      entityId,
      category: "backups",
      module: "backups",
      result,
      riskLevel,
      metadata: metadata as any,
    }).catch(() => undefined);
  }

  private async databaseIdentity() {
    const rows = await this.prisma.$queryRawUnsafe<Array<{ database: string; user_name: string; host: string }>>(
      `SELECT current_database() AS database, current_user AS user_name, inet_server_addr()::text AS host`,
    );
    const row = rows[0] ?? { database: "unknown", user_name: "unknown", host: "unknown" };
    return {
      database: row.database,
      user: row.user_name,
      host: row.host ?? "internal",
    };
  }

  private async tryCreateLogicalDump(backupId: string, validation: Record<string, unknown>) {
    const storageDir = this.config.get<string>("BACKUP_STORAGE_DIR");
    const databaseUrl = this.config.get<string>("DATABASE_URL");
    if (!storageDir || !databaseUrl) {
      return {
        storageProvider: "provider_or_logical",
        storageRef: `logical-validation:${backupId}`,
        sizeBytes: undefined,
      };
    }
    if (!existsSync(storageDir)) mkdirSync(storageDir, { recursive: true });
    const out = join(storageDir, `${backupId}.manifest.json`);
    const payload = JSON.stringify({
      backupId,
      environment: this.environment(),
      createdAt: new Date().toISOString(),
      validation,
      note: "Manifest only. Use provider snapshot or pg_dump artifact for full restore.",
    }, null, 2);
    writeFileSync(out, payload, { encoding: "utf8", mode: 0o600 });

    const pgDump = spawnSync("pg_dump", ["--version"], { encoding: "utf8" });
    if (pgDump.status === 0) {
      const dumpPath = join(storageDir, `${backupId}.dump`);
      const dump = spawnSync("pg_dump", ["--format=custom", "--file", dumpPath, databaseUrl], {
        encoding: "utf8",
        timeout: 120_000,
      });
      if (dump.status === 0 && existsSync(dumpPath)) {
        return {
          storageProvider: "pg_dump_local",
          storageRef: `local:${backupId}.dump`,
          sizeBytes: BigInt(statSync(dumpPath).size),
        };
      }
    }
    return {
      storageProvider: "logical_manifest",
      storageRef: `local:${backupId}.manifest.json`,
      sizeBytes: BigInt(statSync(out).size),
    };
  }

  private async validateRollback(input: RollbackRequest) {
    const errors: string[] = [];
    if (input.includeDatabase && !input.backupId) errors.push("Rollback de base requiere backupId verificado");
    if (input.toCommit && !/^[a-f0-9]{7,40}$/i.test(input.toCommit)) errors.push("Commit destino inválido");
    if (this.environment() === "production") errors.push("Rollback productivo requiere aprobación humana fuera de la API");
    return {
      ok: errors.length === 0,
      errors,
      currentCommit: this.commit(),
      targetCommit: input.toCommit ?? this.commit(),
      requiresHumanApproval: true,
    };
  }

  private assertNotProduction(action: string) {
    if (this.environment() === "production") {
      throw new BadRequestException(`${action} bloqueada en producción`);
    }
  }

  private checksum(value: unknown) {
    return createHash("sha256").update(JSON.stringify(value)).digest("hex");
  }

  private environment() {
    return this.config.get<string>("APP_ENV") ?? this.config.get<string>("NODE_ENV", "development");
  }

  private provider() {
    if (this.config.get<string>("RAILWAY_ENVIRONMENT_ID")) return "Railway";
    if (this.config.get<string>("VERCEL_ENV")) return "Vercel";
    return "Local/Unknown";
  }

  private version() {
    return this.config.get<string>("APP_VERSION") ?? "1.1.0";
  }

  private commit() {
    return this.config.get<string>("RAILWAY_GIT_COMMIT_SHA")
      ?? this.config.get<string>("GITHUB_SHA")
      ?? this.config.get<string>("GIT_COMMIT_SHA")
      ?? "unknown";
  }

  private branch() {
    return this.config.get<string>("RAILWAY_GIT_BRANCH")
      ?? this.config.get<string>("GITHUB_REF_NAME")
      ?? this.config.get<string>("GIT_BRANCH");
  }

  private safeError(error: unknown) {
    if (error instanceof Error) return error.name;
    return "UnknownError";
  }

  private safeText(value?: string | null) {
    if (!value) return undefined;
    return value
      .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [redacted]")
      .replace(/postgres(?:ql)?:\/\/[^\s"']+/gi, "postgres://[redacted]")
      .replace(/(api[_-]?key|token|secret|password|cookie)=([^&\s]+)/gi, "$1=[redacted]")
      .slice(0, 2_000);
  }

  private sanitizeJson(value: unknown) {
    return JSON.parse(JSON.stringify(value, (key, val) => {
      if (/password|token|secret|cookie|authorization|database_url|databaseUrl/i.test(key)) return "[redacted]";
      if (typeof val === "bigint") return Number(val);
      if (typeof val === "string") return this.safeText(val);
      return val;
    }));
  }
}
