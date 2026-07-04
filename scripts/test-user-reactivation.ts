import assert from 'node:assert/strict';
import { UserStatus } from '@prisma/client';
import { AdminService } from '../backend/api/src/admin/admin.service';

const now = new Date();
const users: any[] = [
  {
    id: 'customer-1', name: 'Cliente Reactivacion', email: 'reactivacion@miclub.test',
    phone: '+56991112222', role: 'CUSTOMER', status: UserStatus.ACTIVE,
    deletedAt: null, deletedByUserId: null, lockedAt: null, failedLoginAttempts: 0,
  },
  { id: 'admin-1', name: 'Admin', email: 'admin@miclub.test', role: 'MICLUB_ADMIN', status: UserStatus.ACTIVE },
];
const memberships = [{ id: 'membership-1', customerUserId: 'customer-1', businessId: 'business-1', status: 'ACTIVE' }];
const history = [{ id: 'transaction-1', customerUserId: 'customer-1', businessId: 'business-1' }];
const sessions = [{ id: 'session-1', userId: 'customer-1', revokedAt: null as Date | null }];
const changes: any[] = [];
const findUser = (id: string) => users.find(user => user.id === id);
const tx: any = {
  user: {
    findUniqueOrThrow: ({ where }: any) => ({ ...findUser(where.id) }),
    update: ({ where, data }: any) => Object.assign(findUser(where.id), data),
  },
  authSession: {
    updateMany: ({ where, data }: any) => {
      sessions.filter(row => row.userId === where.userId && row.revokedAt === null).forEach(row => Object.assign(row, data));
      return { count: 1 };
    },
  },
  userChange: { create: ({ data }: any) => { changes.push(data); return data; } },
  auditLog: { create: ({ data }: any) => data },
};
const prisma: any = { ...tx, $transaction: (callback: any) => callback(tx) };
const admin = new AdminService(prisma, { create: async () => ({}) } as any);

async function run() {
  await admin.deleteUser('customer-1', 'admin-1');
  const deleted = findUser('customer-1');
  assert.equal(deleted.status, UserStatus.DELETED);
  assert.ok(deleted.deletedAt);
  assert.equal(deleted.deletedByUserId, 'admin-1');
  assert.ok(sessions[0].revokedAt, 'La eliminación debe revocar la sesión anterior');

  await admin.reactivateUser('customer-1', 'admin-1');
  const active = findUser('customer-1');
  assert.equal(active.status, UserStatus.ACTIVE);
  assert.equal(active.deletedAt, null);
  assert.equal(active.deletedByUserId, null);
  assert.equal(active.lockedAt, null);
  assert.equal(active.failedLoginAttempts, 0);
  assert.equal(users.filter(user => user.id === 'customer-1').length, 1);
  assert.equal(memberships.length, 1, 'La reactivación conserva la inscripción comercial');
  assert.equal(history.length, 1, 'La reactivación conserva el historial');

  Object.assign(active, { status: UserStatus.SUSPENDED, deletedAt: now, deletedByUserId: 'admin-1', lockedAt: now, failedLoginAttempts: 5 });
  await admin.userStatus('customer-1', 'active', 'admin-1');
  assert.deepEqual(
    { status: active.status, deletedAt: active.deletedAt, deletedByUserId: active.deletedByUserId, lockedAt: active.lockedAt, failedLoginAttempts: active.failedLoginAttempts },
    { status: UserStatus.ACTIVE, deletedAt: null, deletedByUserId: null, lockedAt: null, failedLoginAttempts: 0 },
    'Todo camino administrativo hacia ACTIVE debe limpiar el estado residual',
  );
  assert.ok(changes.some(change => change.action === 'user_deleted'));
  assert.ok(changes.some(change => change.action === 'user_reactivated'));
  console.log('OK: eliminación y reactivación de usuario verificadas');
}

run().catch(error => { console.error(error); process.exitCode = 1; });
