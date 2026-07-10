import assert from "node:assert/strict";
import * as bcrypt from "bcrypt";
import { AuthService } from "../backend/api/src/auth/auth.service";

class FakeEmail {
  sent: string[] = [];
  passwordReset() { this.sent.push("password_reset"); return Promise.resolve({ sent: true }); }
  passwordChanged() { this.sent.push("password_changed"); return Promise.resolve({ sent: true }); }
}

class FakeConfig {
  get<T = string>(key: string, fallback?: T): T { return fallback as T; }
  getOrThrow(key: string) { return key; }
}

async function serviceFor(tokens: any[]) {
  const updates: string[] = [];
  const prisma: any = {
    passwordResetToken: {
      findMany: async () => tokens.filter((t) => !t.usedAt && t.expiresAt > new Date()),
      update: ({ where }: any) => { updates.push(`token:${where.id}`); return Promise.resolve({}); },
    },
    user: {
      update: ({ where }: any) => { updates.push(`user:${where.id}`); return Promise.resolve({}); },
    },
    authSession: {
      updateMany: ({ where }: any) => { updates.push(`sessions:${where.userId}`); return Promise.resolve({}); },
    },
    $transaction: async (ops: any[]) => Promise.all(ops),
  };
  const email = new FakeEmail();
  const auth = new AuthService(prisma, {} as any, {} as any, new FakeConfig() as any, email as any);
  return { auth, updates, email };
}

async function run() {
  const token = "valid-reset-token-with-enough-length";
  const tokenHash = await bcrypt.hash(token, 4);
  const activeUser = { id: "u1", status: "ACTIVE", email: "qa@miclubchile.cl", name: "QA" };

  const valid = await serviceFor([{ id: "t1", tokenHash, userId: "u1", expiresAt: new Date(Date.now() + 60_000), usedAt: null, user: activeUser }]);
  const result = await valid.auth.confirmPasswordReset(token, "NuevaClave2026!");
  assert.match(result.message, /actualizada/i, "token válido actualiza contraseña");
  assert.deepEqual(valid.email.sent, ["password_changed"], "envía aviso de cambio");

  const expired = await serviceFor([{ id: "t2", tokenHash, userId: "u1", expiresAt: new Date(Date.now() - 60_000), usedAt: null, user: activeUser }]);
  await assert.rejects(() => expired.auth.confirmPasswordReset(token, "NuevaClave2026!"), /inválido|vencido/i, "token expirado falla");

  const used = await serviceFor([{ id: "t3", tokenHash, userId: "u1", expiresAt: new Date(Date.now() + 60_000), usedAt: new Date(), user: activeUser }]);
  await assert.rejects(() => used.auth.confirmPasswordReset(token, "NuevaClave2026!"), /inválido|vencido/i, "token usado falla");

  const wrong = await serviceFor([{ id: "t4", tokenHash, userId: "u1", expiresAt: new Date(Date.now() + 60_000), usedAt: null, user: activeUser }]);
  await assert.rejects(() => wrong.auth.confirmPasswordReset("otro-token-con-suficiente-largo", "NuevaClave2026!"), /inválido|vencido/i, "token incorrecto falla");

  console.log("OK: pruebas de flujo de recuperación de contraseña superadas");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
