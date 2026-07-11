import assert from "node:assert/strict";
import * as bcrypt from "bcrypt";
import { AuthService } from "../backend/api/src/auth/auth.service";

class FakeEmail {
  sent: string[] = [];
  passwordReset() {
    this.sent.push("password_reset");
    return Promise.resolve({ sent: true });
  }
  passwordChanged() {
    this.sent.push("password_changed");
    return Promise.resolve({ sent: true });
  }
}

class FakeConfig {
  get<T = string>(_key: string, fallback?: T): T {
    return fallback as T;
  }
  getOrThrow(key: string) {
    return key;
  }
}

function authWithPrisma(prisma: any, email = new FakeEmail()) {
  return {
    auth: new AuthService(prisma, {} as any, {} as any, new FakeConfig() as any, email as any),
    email,
  };
}

async function serviceForConfirm(tokens: any[]) {
  const updates: string[] = [];
  const prisma: any = {
    passwordResetToken: {
      findMany: async () => tokens.filter((t) => !t.usedAt && t.expiresAt > new Date()),
      update: ({ where }: any) => {
        updates.push(`token:${where.id}`);
        return Promise.resolve({});
      },
    },
    user: {
      update: ({ where }: any) => {
        updates.push(`user:${where.id}`);
        return Promise.resolve({});
      },
    },
    authSession: {
      updateMany: ({ where }: any) => {
        updates.push(`sessions:${where.userId}`);
        return Promise.resolve({});
      },
    },
    $transaction: async (ops: any[]) => Promise.all(ops),
  };
  return { ...authWithPrisma(prisma), updates };
}

async function serviceForRequest(user: any | null) {
  const operations: string[] = [];
  const prisma: any = {
    user: {
      findUnique: async () => user,
      findFirst: async () => user,
    },
    passwordResetToken: {
      updateMany: async ({ where }: any) => {
        operations.push(`invalidate:${where.userId}`);
        return { count: 1 };
      },
      create: async ({ data }: any) => {
        operations.push(`create:${data.userId}`);
        return { id: "reset-token-1", ...data };
      },
    },
  };
  return { ...authWithPrisma(prisma), operations };
}

async function run() {
  const token = "valid-reset-token-with-enough-length";
  const tokenHash = await bcrypt.hash(token, 4);
  const activeUser = { id: "u1", status: "ACTIVE", email: "qa@miclubchile.cl", name: "QA" };

  const request = await serviceForRequest(activeUser);
  const requestResult = await request.auth.requestPasswordReset("qa@miclubchile.cl", "127.0.0.1");
  assert.match(requestResult.message, /recuperar/i, "respuesta no enumera usuarios");
  assert.deepEqual(request.operations, ["invalidate:u1", "create:u1"], "invalida tokens anteriores antes de crear uno nuevo");
  assert.deepEqual(request.email.sent, ["password_reset"], "envía recuperación a usuario existente activo");

  const nonexistent = await serviceForRequest(null);
  const missingResult = await nonexistent.auth.requestPasswordReset("no-existe@miclubchile.cl", "127.0.0.2");
  assert.match(missingResult.message, /recuperar/i, "email inexistente recibe respuesta genérica");
  assert.deepEqual(nonexistent.operations, [], "email inexistente no crea tokens");
  assert.deepEqual(nonexistent.email.sent, [], "email inexistente no envía correo");

  const limited = await serviceForRequest(activeUser);
  await limited.auth.requestPasswordReset("qa@miclubchile.cl", "127.0.0.3");
  await limited.auth.requestPasswordReset("qa@miclubchile.cl", "127.0.0.3");
  await limited.auth.requestPasswordReset("qa@miclubchile.cl", "127.0.0.3");
  await assert.rejects(
    () => limited.auth.requestPasswordReset("qa@miclubchile.cl", "127.0.0.3"),
    /Demasiadas solicitudes/i,
    "rate limit bloquea exceso de solicitudes",
  );

  const valid = await serviceForConfirm([
    { id: "t1", tokenHash, userId: "u1", expiresAt: new Date(Date.now() + 60_000), usedAt: null, user: activeUser },
  ]);
  const result = await valid.auth.confirmPasswordReset(token, "NuevaClave2026!");
  assert.match(result.message, /actualizada/i, "token válido actualiza contraseña");
  assert.deepEqual(valid.email.sent, ["password_changed"], "envía aviso de cambio");

  const expired = await serviceForConfirm([
    { id: "t2", tokenHash, userId: "u1", expiresAt: new Date(Date.now() - 60_000), usedAt: null, user: activeUser },
  ]);
  await assert.rejects(() => expired.auth.confirmPasswordReset(token, "NuevaClave2026!"), /inv.lido|vencido/i, "token expirado falla");

  const used = await serviceForConfirm([
    { id: "t3", tokenHash, userId: "u1", expiresAt: new Date(Date.now() + 60_000), usedAt: new Date(), user: activeUser },
  ]);
  await assert.rejects(() => used.auth.confirmPasswordReset(token, "NuevaClave2026!"), /inv.lido|vencido/i, "token usado falla");

  const wrong = await serviceForConfirm([
    { id: "t4", tokenHash, userId: "u1", expiresAt: new Date(Date.now() + 60_000), usedAt: null, user: activeUser },
  ]);
  await assert.rejects(
    () => wrong.auth.confirmPasswordReset("otro-token-con-suficiente-largo", "NuevaClave2026!"),
    /inv.lido|vencido/i,
    "token incorrecto falla",
  );

  console.log("OK: pruebas de flujo de recuperación de contraseña superadas");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
