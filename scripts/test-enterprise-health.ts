import { ObservabilityService } from "../backend/api/src/observability/observability.service";

type Env = Record<string, string | undefined>;

class FakeConfig {
  constructor(private readonly env: Env) {}
  get<T = string>(key: string, fallback?: T): T {
    return (this.env[key] ?? fallback) as T;
  }
}

class FakePrisma {
  constructor(private readonly fail = false) {}
  async $queryRaw() {
    if (this.fail) throw new Error("database down");
    return [{ ok: 1 }];
  }
}

const originalFetch = globalThis.fetch;

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

function baseEnv(overrides: Env = {}): Env {
  return {
    APP_ENV: "staging",
    NODE_ENV: "staging",
    DATABASE_URL: "postgresql://example:example@localhost:5432/miclub_test",
    JWT_SECRET: "configured",
    JWT_REFRESH_SECRET: "configured",
    CORS_ORIGIN: "https://staging-admin.miclubchile.cl",
    FRONTEND_URL: "https://staging.miclubchile.cl",
    APP_URL: "https://staging-app.miclubchile.cl",
    CUSTOMER_APP_URL: "https://staging-app.miclubchile.cl",
    COMMERCE_APP_URL: "https://staging-comercio.miclubchile.cl",
    CASHIER_APP_URL: "https://staging-cajero.miclubchile.cl",
    ADMIN_APP_URL: "https://staging-admin.miclubchile.cl",
    API_URL: "https://miclub-chile-staging.up.railway.app/api",
    EMAIL_FROM: "MiClub Chile <no-reply@miclubchile.cl>",
    SUPPORT_EMAIL: "soporte@miclubchile.cl",
    RESEND_API_KEY: "configured-but-not-used",
    RAILWAY_SERVICE_ID: "railway-service",
    RAILWAY_ENVIRONMENT_ID: "railway-staging",
    RAILWAY_DEPLOYMENT_ID: "deploy-123",
    RAILWAY_GIT_REPO_NAME: "CarlosFuentes32/miclub-chile",
    RAILWAY_GIT_BRANCH: "fix/mvp-comercial-readiness",
    RAILWAY_GIT_COMMIT_SHA: "abcdef1234567890",
    APP_VERSION: "1.1.0-enterprise-test",
    BUILD_NUMBER: "enterprise-1",
    BUILD_TIME: "2026-07-11T12:00:00.000Z",
    LAST_PLAYWRIGHT_STATUS: "success",
    LAST_PLAYWRIGHT_RUN_ID: "29157600553",
    LAST_PLAYWRIGHT_RUN_URL: "https://github.com/CarlosFuentes32/miclub-chile/actions/runs/29157600553",
    LAST_PLAYWRIGHT_RUN_AT: "2026-07-11T15:20:00.000Z",
    ...overrides,
  };
}

function service(env: Env, failDb = false) {
  return new ObservabilityService(
    new FakePrisma(failDb) as any,
    new FakeConfig(env) as any,
  );
}

async function run() {
  globalThis.fetch = (async () =>
    ({
      status: 200,
      ok: true,
    }) as Response) as typeof fetch;

  const healthy = await service(baseEnv()).getEnterpriseHealth();
  assert(healthy.status === "ok", "Health OK debe quedar ok");
  assert(healthy.checks.database.status === "ok", "DB debe estar ok");
  assert(healthy.checks.prisma.status === "ok", "Prisma debe estar ok");
  assert(healthy.checks.variables.status === "ok", "Variables críticas deben estar ok");
  assert(healthy.version.version === "1.1.0-enterprise-test", "Debe exponer versión");
  assert(healthy.version.commit === "abcdef1234567890", "Debe exponer commit");
  assert(healthy.deployment.branch === "fix/mvp-comercial-readiness", "Debe exponer rama");
  assert(healthy.environment === "staging", "Debe exponer ambiente staging");
  assert(healthy.runtime.responseTimeMs >= 0, "Debe medir tiempo de respuesta");
  assert(healthy.runtime.memory.rssMb > 0, "Debe reportar memoria");
  assert(healthy.checks.playwright.status === "ok", "Playwright debe quedar ok cuando LAST_PLAYWRIGHT_STATUS=success");

  const dbDown = await service(baseEnv(), true).getEnterpriseHealth();
  assert(dbDown.status === "degraded", "DB desconectada debe degradar health");
  assert(dbDown.checks.database.status === "error", "DB desconectada debe marcar error");
  assert(dbDown.checks.prisma.status === "error", "Prisma debe marcar error si no puede consultar");

  const missingVars = await service(baseEnv({ DATABASE_URL: undefined, JWT_SECRET: undefined })).getEnterpriseHealth();
  assert(missingVars.status === "degraded", "Variables faltantes deben degradar health");
  assert(missingVars.checks.variables.status === "error", "Variables críticas faltantes deben marcar error");
  assert(
    Array.isArray(missingVars.checks.variables.metadata?.missingRequired)
      && (missingVars.checks.variables.metadata?.missingRequired as string[]).includes("DATABASE_URL"),
    "Debe listar variables críticas faltantes",
  );

  globalThis.fetch = (async () =>
    ({
      status: 503,
      ok: false,
    }) as Response) as typeof fetch;
  const frontendFailure = await service(baseEnv()).getEnterpriseHealth();
  assert(frontendFailure.checks.landing.status === "error", "Frontend con 503 debe marcar error");
  assert(frontendFailure.status === "degraded", "Falla frontend debe degradar health");

  globalThis.fetch = originalFetch;
  console.log("OK: health enterprise, variables, versionado, commit, ambiente, tiempos y fallos verificados");
}

run().catch((error) => {
  globalThis.fetch = originalFetch;
  console.error(error);
  process.exit(1);
});
