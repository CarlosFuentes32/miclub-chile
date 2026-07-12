import assert from "node:assert/strict";
import { AuditService } from "../backend/api/src/audit/audit.service";
import { RequestContextService } from "../backend/api/src/enterprise-logging/request-context.service";
import { csvSafe, sanitizeJson } from "../backend/api/src/enterprise-logging/sensitive-data";

const createdAudit: any[] = [];
let errorRecord: any | null = null;

const prisma = {
  auditLog: {
    create: async ({ data }: any) => {
      createdAudit.push(data);
      return { id: `audit-${createdAudit.length}`, ...data, createdAt: new Date() };
    },
    count: async () => 0,
    findMany: async () => [],
    findUnique: async () => null,
  },
  systemError: {
    upsert: async ({ create, update }: any) => {
      if (!errorRecord) errorRecord = { id: "err-1", occurrenceCount: 1, ...create };
      else {
        const { occurrenceCount: _ignored, ...rest } = update;
        errorRecord = { ...errorRecord, ...rest, occurrenceCount: errorRecord.occurrenceCount + 1 };
      }
      return errorRecord;
    },
    count: async () => 1,
    findMany: async () => [errorRecord],
    findUnique: async () => errorRecord,
    update: async ({ data }: any) => ({ ...errorRecord, ...data }),
  },
} as any;

const context = new RequestContextService();
const logger = {
  audit: () => undefined,
  error: () => undefined,
  environment: () => "staging",
  version: () => "1.1.0",
  commit: () => "test-commit",
  buildNumber: () => "test-build",
} as any;

const service = new AuditService(prisma, context, logger);

function fakeRequest() {
  return {
    method: "POST",
    originalUrl: "/api/admin/businesses",
    url: "/api/admin/businesses",
    ip: "190.10.10.10",
    socket: { remoteAddress: "190.10.10.10" },
    user: { id: "user-admin", role: "SUPER_ADMIN", businessId: "business-1" },
    header: (name: string) => name.toLowerCase() === "user-agent" ? "Playwright QA" : undefined,
  } as any;
}

async function main() {
  assert.equal(RequestContextService.safeIncomingId("bad\nid"), undefined);
  assert.ok(RequestContextService.safeIncomingId("qa-request-1234"));
  assert.notEqual(RequestContextService.newId(), RequestContextService.newId());

  const payload = sanitizeJson({
    password: "MiClubPrueba2026!",
    token: "abc.def.ghi",
    authorization: "Bearer secret-token",
    email: "cliente.qa@example.com",
    phone: "+56981302657",
    rut: "12.345.678-5",
    nested: { refreshToken: "refresh-secret" },
  });
  const serialized = JSON.stringify(payload);
  assert(!serialized.includes("MiClubPrueba2026!"));
  assert(!serialized.includes("secret-token"));
  assert(!serialized.includes("+56981302657"));
  assert(!serialized.includes("12.345.678-5"));
  assert(serialized.includes("[redacted]"));

  await new Promise<void>((resolve) => {
    context.run({
      requestId: "qa-request-1234",
      correlationId: "qa-correlation-1234",
      startedAt: Date.now() - 25,
      request: fakeRequest(),
    }, async () => {
      await service.create({
        action: "business_created",
        entityType: "business",
        entityId: "business-1",
        metadata: { password: "never-log-this", email: "owner@example.com" },
        previousState: { status: "draft" },
        nextState: { status: "active" },
      });
      resolve();
    });
  });
  const audit = createdAudit[0];
  assert.equal(audit.requestId, "qa-request-1234");
  assert.equal(audit.correlationId, "qa-correlation-1234");
  assert.equal(audit.actorRole, "SUPER_ADMIN");
  assert.equal(audit.environment, "staging");
  assert.equal(audit.result, "SUCCESS");
  assert.equal(audit.category, "administration");
  assert(!JSON.stringify(audit).includes("never-log-this"));

  await new Promise<void>((resolve) => {
    context.run({
      requestId: "qa-request-5000",
      correlationId: "qa-correlation-5000",
      startedAt: Date.now(),
      request: fakeRequest(),
    }, async () => {
      await service.recordSystemError({
        error: new Error("DATABASE_URL=postgres://user:pass@host/db password=super-secret"),
        module: "qa",
        endpoint: "/api/qa/error",
        method: "GET",
        statusCode: 500,
      });
      await service.recordSystemError({
        error: new Error("DATABASE_URL=postgres://user:pass@host/db password=super-secret"),
        module: "qa",
        endpoint: "/api/qa/error",
        method: "GET",
        statusCode: 500,
      });
      resolve();
    });
  });
  assert.equal(errorRecord.occurrenceCount, 2);
  assert(!JSON.stringify(errorRecord).includes("postgres://user:pass"));
  assert(!JSON.stringify(errorRecord).includes("super-secret"));
  assert.equal(errorRecord.requestId, "qa-request-5000");

  assert.equal(csvSafe("=HYPERLINK(\"http://evil\")"), "\"'=HYPERLINK(\"\"http://evil\"\")\"");
  assert.equal(service.retentionDryRun().destructiveActionExecuted, false);

  console.log("OK: logs enterprise, auditoría, sanitización, deduplicación, CSV seguro y retención dry-run verificados");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
