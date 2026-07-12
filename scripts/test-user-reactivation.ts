import assert from "node:assert/strict";
import { ConflictException, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { UserStatus } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { AdminService } from "../backend/api/src/admin/admin.service";
import { AuthService } from "../backend/api/src/auth/auth.service";

const password = "ReactivaSeguro2026!";
const passwordHash = bcrypt.hashSync(password, 4);
const now = new Date();

const users: any[] = [
  {
    id: "customer-1",
    name: "Cliente Reactivacion",
    email: "reactivacion@miclub.test",
    phone: "+56991112222",
    role: "CUSTOMER",
    status: UserStatus.ACTIVE,
    passwordHash,
    deletedAt: null,
    deletedByUserId: null,
    lockedAt: null,
    failedLoginAttempts: 0,
    forcePasswordChange: false,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "suspended-1",
    name: "Usuario Suspendido",
    email: "suspendido@miclub.test",
    phone: "+56990000001",
    role: "CUSTOMER",
    status: UserStatus.SUSPENDED,
    passwordHash,
    deletedAt: null,
    deletedByUserId: null,
    lockedAt: now,
    failedLoginAttempts: 5,
    forcePasswordChange: false,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "active-1",
    name: "Usuario Activo",
    email: "activo@miclub.test",
    phone: "+56990000002",
    role: "CUSTOMER",
    status: UserStatus.ACTIVE,
    passwordHash,
    deletedAt: null,
    deletedByUserId: null,
    lockedAt: null,
    failedLoginAttempts: 0,
    forcePasswordChange: false,
    createdAt: now,
    updatedAt: now,
  },
  { id: "admin-1", name: "Admin", email: "admin@miclub.test", role: "MICLUB_ADMIN", status: UserStatus.ACTIVE, passwordHash },
];

const memberships = [{ id: "membership-1", customerUserId: "customer-1", businessId: "business-1", status: "ACTIVE" }];
const cycles = [{ id: "cycle-1", customerUserId: "customer-1", businessId: "business-1" }];
const rewards = [{ id: "reward-1", customerUserId: "customer-1", businessId: "business-1" }];
const history = [{ id: "transaction-1", customerUserId: "customer-1", businessId: "business-1" }];
const sessions = [{ id: "session-1", userId: "customer-1", refreshTokenHash: "old", expiresAt: new Date(Date.now() + 60_000), revokedAt: null as Date | null }];
const changes: any[] = [];
const auditLogs: any[] = [];
const sentEmails: any[] = [];

const findUser = (id: string) => users.find((user) => user.id === id);
const findUserByEmail = (email: string) => users.find((user) => user.email === email);
const findUserByPhone = (phone: string) => users.find((user) => user.phone === phone);

function publicUser(user: any) {
  if (!user) return null;
  const { passwordHash: _passwordHash, ...safe } = user;
  return { ...safe };
}

function selectUser(user: any, select?: Record<string, boolean>) {
  if (!user) return null;
  if (!select) return { ...user };
  const row: any = {};
  for (const [key, include] of Object.entries(select)) {
    if (include) row[key] = user[key];
  }
  return row;
}

const tx: any = {
  user: {
    findUnique: ({ where, select }: any) => {
      const user = where.id ? findUser(where.id) : where.email ? findUserByEmail(where.email) : null;
      return selectUser(user, select);
    },
    findFirst: ({ where }: any) => {
      if (where.phone) return { ...findUserByPhone(where.phone) };
      return null;
    },
    findUniqueOrThrow: ({ where, select }: any) => {
      const user = where.id ? findUser(where.id) : where.email ? findUserByEmail(where.email) : null;
      if (!user) throw new NotFoundException("Usuario no encontrado");
      return selectUser(user, select);
    },
    update: ({ where, data, select }: any) => {
      const user = findUser(where.id);
      if (!user) throw new NotFoundException("Usuario no encontrado");
      Object.assign(user, data, { updatedAt: new Date() });
      return select ? selectUser(user, select) : { ...user };
    },
  },
  authSession: {
    create: ({ data }: any) => {
      const row = { id: `session-${sessions.length + 1}`, revokedAt: null, ...data };
      sessions.push(row);
      return row;
    },
    update: ({ where, data }: any) => {
      const row = sessions.find((session) => session.id === where.id);
      Object.assign(row, data);
      return row;
    },
    updateMany: ({ where, data }: any) => {
      const rows = sessions.filter((row) => row.userId === where.userId && (where.revokedAt === undefined || row.revokedAt === where.revokedAt));
      rows.forEach((row) => Object.assign(row, data));
      return { count: rows.length };
    },
    findUnique: ({ where, include }: any) => {
      const row = sessions.find((session) => session.id === where.id);
      if (!row) return null;
      return include?.user ? { ...row, user: findUser(row.userId) } : { ...row };
    },
  },
  userChange: {
    create: ({ data }: any) => {
      changes.push({ id: `change-${changes.length + 1}`, createdAt: new Date(), ...data });
      return data;
    },
  },
  auditLog: {
    create: ({ data }: any) => {
      auditLogs.push({ id: `audit-${auditLogs.length + 1}`, createdAt: new Date(), ...data });
      return data;
    },
  },
};

const prisma: any = { ...tx, $transaction: (callback: any) => (Array.isArray(callback) ? Promise.all(callback) : callback(tx)) };
const audit = { create: (input: any, client: any = prisma) => client.auditLog.create({ data: input }) };
const email = {
  accountStatus: async (to: string, name: string, status: string) => {
    sentEmails.push({ to, name, status });
    return { sent: true };
  },
};
const admin = new AdminService(prisma, audit as any, email as any);

const jwt = {
  signAsync: async (payload: any) => `token:${payload.type}:${payload.sub}:${payload.sid ?? "access"}`,
  verifyAsync: async () => ({}),
};
const config = {
  get: (_key: string, fallback?: any) => fallback,
  getOrThrow: (key: string) => `${key}_secret`,
};
const auth = new AuthService(prisma, { createCustomer: async () => null, findPublicById: async () => null } as any, jwt as any, config as any, email as any, audit as any);

async function expectRejectsWith(errorType: any, action: () => Promise<unknown>) {
  let thrown: unknown;
  try {
    await action();
  } catch (error) {
    thrown = error;
  }
  assert.ok(thrown instanceof errorType, `Esperaba ${errorType.name}, recibí ${thrown instanceof Error ? thrown.constructor.name : typeof thrown}`);
}

async function run() {
  await admin.deleteUser("customer-1", "admin-1");
  const deleted = findUser("customer-1");
  assert.equal(deleted.status, UserStatus.DELETED);
  assert.ok(deleted.deletedAt);
  assert.equal(deleted.deletedByUserId, "admin-1");
  assert.ok(sessions[0].revokedAt, "La eliminación debe revocar la sesión anterior");

  await expectRejectsWith(UnauthorizedException, () => auth.login({ email: "reactivacion@miclub.test", password }));

  await admin.reactivateUser("customer-1", "admin-1");
  const active = findUser("customer-1");
  assert.equal(active.status, UserStatus.ACTIVE);
  assert.equal(active.deletedAt, null);
  assert.equal(active.deletedByUserId, null);
  assert.equal(active.lockedAt, null);
  assert.equal(active.failedLoginAttempts, 0);
  assert.equal(users.filter((user) => user.id === "customer-1").length, 1, "No debe crear usuarios duplicados");
  assert.equal(memberships.length, 1, "La reactivación conserva la inscripción comercial");
  assert.equal(cycles.length, 1, "La reactivación conserva el progreso/ciclo");
  assert.equal(rewards.length, 1, "La reactivación conserva recompensas");
  assert.equal(history.length, 1, "La reactivación conserva el historial");
  assert.ok(changes.some((change) => change.action === "user_reactivated" && change.oldValue === UserStatus.DELETED));
  assert.ok(auditLogs.some((log) => log.action === "user_reactivated" && log.entityId === "customer-1" && log.metadata?.previous_status === UserStatus.DELETED));
  assert.ok(sentEmails.some((mail) => mail.to === "reactivacion@miclub.test" && mail.status === "reactivated"));

  const login = await auth.login({ email: "reactivacion@miclub.test", password });
  assert.equal(login.user.id, "customer-1");
  assert.equal(login.user.role, "CUSTOMER");
  assert.ok(login.accessToken);
  assert.ok(login.refreshToken);

  await admin.reactivateUser("suspended-1", "admin-1");
  const suspended = findUser("suspended-1");
  assert.equal(suspended.status, UserStatus.ACTIVE);
  assert.equal(suspended.lockedAt, null);
  assert.equal(suspended.failedLoginAttempts, 0);

  await expectRejectsWith(ConflictException, () => admin.reactivateUser("active-1", "admin-1"));
  await expectRejectsWith(NotFoundException, () => admin.reactivateUser("missing-1", "admin-1"));

  Object.assign(active, { status: UserStatus.SUSPENDED, deletedAt: now, deletedByUserId: "admin-1", lockedAt: now, failedLoginAttempts: 5 });
  await admin.userStatus("customer-1", "active", "admin-1");
  assert.deepEqual(
    { status: active.status, deletedAt: active.deletedAt, deletedByUserId: active.deletedByUserId, lockedAt: active.lockedAt, failedLoginAttempts: active.failedLoginAttempts },
    { status: UserStatus.ACTIVE, deletedAt: null, deletedByUserId: null, lockedAt: null, failedLoginAttempts: 0 },
    "Todo camino administrativo hacia ACTIVE debe limpiar el estado residual",
  );
  assert.ok(changes.some((change) => change.action === "user_deleted"));
  assert.ok(changes.some((change) => change.action === "user_status_changed"));
  console.log("OK: eliminación, suspensión, reactivación, login y auditoría de usuario verificadas");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
