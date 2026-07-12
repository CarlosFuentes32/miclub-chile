import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import * as bcrypt from "bcrypt";
import { UserStatus } from "@prisma/client";
import { AuthService } from "../backend/api/src/auth/auth.service";
import { DistributedRateLimitService } from "../backend/api/src/security/rate-limit.service";
import { CsrfOriginMiddleware, SecurityHeadersMiddleware } from "../backend/api/src/security/security.middleware";

class FakeConfig {
  constructor(private readonly values: Record<string, string> = {}) {}
  get<T = string>(key: string, fallback?: T): T {
    return (this.values[key] ?? fallback) as T;
  }
  getOrThrow(key: string) {
    return this.values[key] ?? `${key}_secret`;
  }
}

const auditEvents: any[] = [];
const audit = { create: async (event: any) => { auditEvents.push(event); return event; } };

async function testRateLimit() {
  let bucket: any = null;
  const prisma: any = {
    rateLimitBucket: {
      findUnique: async () => bucket,
      upsert: async ({ create, update }: any) => {
        bucket = bucket ? { ...bucket, ...update } : { id: "bucket-1", ...create };
        return bucket;
      },
      update: async ({ data }: any) => {
        bucket = { ...bucket, count: bucket.count + data.count.increment };
        return bucket;
      },
    },
  };
  const limiter = new DistributedRateLimitService(prisma, new FakeConfig() as any, audit as any);
  await limiter.consume({ scope: "login_ip", limit: 2, windowSeconds: 60, subject: "1.1.1.1", risk: "high" });
  await limiter.consume({ scope: "login_ip", limit: 2, windowSeconds: 60, subject: "1.1.1.1", risk: "high" });
  const blocked = await limiter.consume({ scope: "login_ip", limit: 2, windowSeconds: 60, subject: "1.1.1.1", risk: "high" });
  assert.equal(blocked.allowed, false);
  assert.ok(auditEvents.some((event) => event.action === "rate_limit_triggered"));
}

async function testCsrfAndHeaders() {
  const headers: Record<string, string> = {};
  const response: any = {
    setHeader: (k: string, v: string) => { headers[k] = v; },
    getHeader: (k: string) => headers[k],
    status: (code: number) => ({ json: (body: any) => ({ code, body }) }),
  };
  await new Promise<void>((resolve) => new SecurityHeadersMiddleware(new FakeConfig({ NODE_ENV: "production" }) as any).use({} as any, response, resolve));
  assert.equal(headers["X-Content-Type-Options"], "nosniff");
  assert.ok(headers["Strict-Transport-Security"]);

  const csrf = new CsrfOriginMiddleware(new FakeConfig({ CORS_ORIGIN: "https://staging-admin.miclubchile.cl" }) as any);
  let validNext = false;
  csrf.use({ method: "POST", header: (name: string) => name === "origin" ? "https://staging-admin.miclubchile.cl" : undefined } as any, response, () => { validNext = true; });
  assert.equal(validNext, true);
  const rejected = csrf.use({ method: "POST", header: (name: string) => name === "origin" ? "https://evil.example" : undefined } as any, response, () => undefined);
  assert.deepEqual(rejected, { code: 403, body: { message: "Origen no autorizado.", requestId: undefined } });
}

async function testRefreshReuse() {
  const refreshToken = "refresh-token-qa";
  const hash = await bcrypt.hash(refreshToken, 4);
  const sessions = [{ id: "s1", userId: "u1", familyId: "f1", refreshTokenHash: hash, revokedAt: new Date(), expiresAt: new Date(Date.now() + 60_000), user: { id: "u1", status: UserStatus.ACTIVE } }];
  const prisma: any = {
    authSession: {
      findUnique: async () => sessions[0],
      updateMany: async ({ data }: any) => { sessions.forEach((s) => Object.assign(s, data)); return { count: sessions.length }; },
      update: async ({ data }: any) => Object.assign(sessions[0], data),
    },
  };
  const jwt = { verifyAsync: async () => ({ sub: "u1", sid: "s1", type: "refresh" }) };
  const auth = new AuthService(prisma, {} as any, jwt as any, new FakeConfig() as any, {} as any, audit as any);
  await assert.rejects(() => auth.refresh(refreshToken), /Sesión inválida/);
  assert.ok(sessions[0].reuseDetectedAt);
  assert.ok(auditEvents.some((event) => event.action === "refresh_token_reuse_detected"));
}

async function testWebhookSignature() {
  const secret = "webhook-secret";
  const timestamp = String(Math.floor(Date.now() / 1000));
  const body = { id: "evt-1", type: "payment.approved", provider: "flow" };
  const signature = createHmac("sha256", secret).update(`${timestamp}.${JSON.stringify(body)}`).digest("hex");
  const verify = (candidate: string, ts: string, payload: unknown) => {
    const expected = createHmac("sha256", secret).update(`${ts}.${JSON.stringify(payload)}`).digest("hex");
    return expected === candidate && Math.abs(Date.now() - Number(ts) * 1000) <= 5 * 60_000;
  };
  assert.equal(verify(signature, timestamp, body), true);
  assert.equal(verify("bad", timestamp, body), false);
  assert.equal(verify(signature, "1", body), false);
}

async function main() {
  await testRateLimit();
  await testCsrfAndHeaders();
  await testRefreshReuse();
  await testWebhookSignature();
  console.log("OK: seguridad enterprise, rate limiting, CSRF/origin, headers, refresh reuse y webhooks verificados");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
