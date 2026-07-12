import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import {
  DeploymentInfo,
  EnterpriseHealth,
  SystemCheck,
  SystemCheckStatus,
  VersionInfo,
} from "./observability.types";

const STARTED_AT = new Date();
const BUILD_STARTED_AT = process.env.BUILD_TIME ?? process.env.BUILD_DATE ?? STARTED_AT.toISOString();

@Injectable()
export class ObservabilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async getEnterpriseHealth(): Promise<EnterpriseHealth> {
    const startedAt = Date.now();
    const environment = this.environment();
    const checks = await this.collectChecks();
    const summary = Object.values(checks).reduce(
      (acc, check) => {
        acc[check.status] += 1;
        return acc;
      },
      { ok: 0, warning: 0, error: 0, unknown: 0 },
    );

    return {
      status: summary.error > 0 ? "degraded" : summary.warning > 0 || summary.unknown > 0 ? "degraded" : "ok",
      service: "MiClub API",
      environment,
      summary,
      checks,
      version: this.versionInfo(),
      deployment: this.deploymentInfo(environment),
      runtime: {
        nodeVersion: process.version,
        uptimeSeconds: Math.round(process.uptime()),
        memory: this.memoryInfo(),
        responseTimeMs: Date.now() - startedAt,
      },
      lastPlaywright: {
        status: this.statusFromString(this.config.get<string>("LAST_PLAYWRIGHT_STATUS", "unknown")),
        runId: this.config.get<string>("LAST_PLAYWRIGHT_RUN_ID", "unknown"),
        runUrl: this.config.get<string>("LAST_PLAYWRIGHT_RUN_URL", ""),
        executedAt: this.config.get<string>("LAST_PLAYWRIGHT_RUN_AT", "unknown"),
      },
      timestamp: new Date().toISOString(),
    };
  }

  getLiveness() {
    return {
      status: "ok",
      service: "MiClub API",
      environment: this.environment(),
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }

  async getReadiness() {
    const startedAt = Date.now();
    const [database, prisma, variables] = await Promise.all([
      this.databaseCheck(),
      this.prismaCheck(),
      this.variablesCheck(),
    ]);
    const checks = { database, prisma, variables };
    const ready = Object.values(checks).every((check) => check.status === "ok");
    return {
      status: ready ? "ready" : "not_ready",
      service: "MiClub API",
      environment: this.environment(),
      checks,
      version: this.versionInfo(),
      responseTimeMs: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
    };
  }

  private async collectChecks(): Promise<Record<string, SystemCheck>> {
    const [
      api,
      database,
      prisma,
      connectivity,
      variables,
      railway,
      vercel,
      landing,
      customer,
      commerce,
      cashier,
      admin,
      emails,
      ssl,
      lastDeploy,
      environment,
      commit,
      version,
      buildDate,
      playwright,
    ] = await Promise.all([
      this.apiCheck(),
      this.databaseCheck(),
      this.prismaCheck(),
      this.connectivityCheck(),
      this.variablesCheck(),
      this.railwayCheck(),
      this.vercelCheck(),
      this.urlCheck("landing", "Landing", this.config.get<string>("FRONTEND_URL"), false),
      this.urlCheck("customer", "Cliente", this.config.get<string>("CUSTOMER_APP_URL") ?? this.config.get<string>("APP_URL"), false),
      this.urlCheck("commerce", "Comercio", this.config.get<string>("COMMERCE_APP_URL"), false),
      this.urlCheck("cashier", "Cajero", this.config.get<string>("CASHIER_APP_URL"), false),
      this.urlCheck("admin", "Administrador", this.config.get<string>("ADMIN_APP_URL"), false),
      this.emailCheck(),
      this.sslCheck(),
      this.lastDeployCheck(),
      this.environmentCheck(),
      this.commitCheck(),
      this.versionCheck(),
      this.buildDateCheck(),
      this.playwrightCheck(),
    ]);

    return {
      api,
      database,
      prisma,
      connectivity,
      variables,
      railway,
      vercel,
      landing,
      customer,
      commerce,
      cashier,
      admin,
      emails,
      ssl,
      lastDeploy,
      environment,
      commit,
      version,
      buildDate,
      playwright,
    };
  }

  private async apiCheck(): Promise<SystemCheck> {
    return {
      key: "api",
      label: "API",
      status: "ok",
      message: "API operativa",
      metadata: { service: "MiClub API" },
    };
  }

  private async databaseCheck(): Promise<SystemCheck> {
    const startedAt = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        key: "database",
        label: "Base de datos",
        status: "ok",
        message: "PostgreSQL responde correctamente",
        responseTimeMs: Date.now() - startedAt,
      };
    } catch (error) {
      return {
        key: "database",
        label: "Base de datos",
        status: "error",
        message: "PostgreSQL no responde",
        responseTimeMs: Date.now() - startedAt,
        metadata: { error: this.safeError(error) },
      };
    }
  }

  private async prismaCheck(): Promise<SystemCheck> {
    const startedAt = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT current_database()`;
      return {
        key: "prisma",
        label: "Prisma",
        status: "ok",
        message: "Prisma Client operativo",
        responseTimeMs: Date.now() - startedAt,
        metadata: { clientVersion: Prisma.prismaVersion.client },
      };
    } catch (error) {
      return {
        key: "prisma",
        label: "Prisma",
        status: "error",
        message: "Prisma no puede consultar la base",
        responseTimeMs: Date.now() - startedAt,
        metadata: { clientVersion: Prisma.prismaVersion.client, error: this.safeError(error) },
      };
    }
  }

  private async connectivityCheck(): Promise<SystemCheck> {
    const candidates = [
      this.config.get<string>("API_URL"),
      this.config.get<string>("FRONTEND_URL"),
      this.config.get<string>("ADMIN_APP_URL"),
    ].filter(Boolean) as string[];

    if (!candidates.length) {
      return {
        key: "connectivity",
        label: "Conectividad",
        status: "warning",
        message: "No hay URLs configuradas para validar conectividad externa",
      };
    }

    const results = await Promise.all(candidates.map((url) => this.pingUrl(url, 2_500)));
    const failed = results.filter((result) => result.status === "error");
    return {
      key: "connectivity",
      label: "Conectividad",
      status: failed.length ? "warning" : "ok",
      message: failed.length ? `${failed.length} URL(s) no respondieron correctamente` : "URLs principales alcanzables",
      metadata: { results },
    };
  }

  private async variablesCheck(): Promise<SystemCheck> {
    const required = ["DATABASE_URL", "JWT_SECRET", "JWT_REFRESH_SECRET", "APP_ENV", "NODE_ENV", "CORS_ORIGIN"];
    const recommended = ["FRONTEND_URL", "APP_URL", "ADMIN_APP_URL", "COMMERCE_APP_URL", "CASHIER_APP_URL", "EMAIL_FROM", "SUPPORT_EMAIL"];
    const missingRequired = required.filter((key) => !this.config.get<string>(key));
    const missingRecommended = recommended.filter((key) => !this.config.get<string>(key));
    return {
      key: "variables",
      label: "Variables críticas",
      status: missingRequired.length ? "error" : missingRecommended.length ? "warning" : "ok",
      message: missingRequired.length
        ? `Faltan variables críticas: ${missingRequired.join(", ")}`
        : missingRecommended.length
          ? `Faltan variables recomendadas: ${missingRecommended.join(", ")}`
          : "Variables críticas configuradas",
      metadata: { missingRequired, missingRecommended },
    };
  }

  private async railwayCheck(): Promise<SystemCheck> {
    const serviceId = this.config.get<string>("RAILWAY_SERVICE_ID");
    const environmentId = this.config.get<string>("RAILWAY_ENVIRONMENT_ID");
    return {
      key: "railway",
      label: "Railway",
      status: serviceId || environmentId ? "ok" : "warning",
      message: serviceId || environmentId ? "Despliegue Railway detectado" : "No se detectaron metadatos Railway",
      metadata: {
        serviceId: this.redact(serviceId),
        environmentId: this.redact(environmentId),
        deploymentId: this.redact(this.config.get<string>("RAILWAY_DEPLOYMENT_ID")),
      },
    };
  }

  private async vercelCheck(): Promise<SystemCheck> {
    const urls = [
      this.config.get<string>("FRONTEND_URL"),
      this.config.get<string>("CUSTOMER_APP_URL"),
      this.config.get<string>("COMMERCE_APP_URL"),
      this.config.get<string>("CASHIER_APP_URL"),
      this.config.get<string>("ADMIN_APP_URL"),
    ].filter(Boolean) as string[];
    const vercelUrls = urls.filter((url) => url.includes("vercel.app") || url.includes("miclubchile.cl"));
    return {
      key: "vercel",
      label: "Vercel",
      status: vercelUrls.length ? "ok" : "warning",
      message: vercelUrls.length ? "Frontends configurados para verificación" : "No hay URLs frontend configuradas",
      metadata: { configuredFrontends: vercelUrls.length },
    };
  }

  private async urlCheck(key: string, label: string, url?: string, required = true): Promise<SystemCheck> {
    if (!url) {
      return { key, label, status: "warning", message: "URL no configurada" };
    }
    const result = await this.pingUrl(url, 3_000);
    const status = !required && result.status === "error" ? "warning" : result.status;
    return {
      key,
      label,
      status,
      message: status === "warning" && result.status === "error"
        ? `${result.message}. Dependencia frontend opcional/no bloqueante para readiness API`
        : result.message,
      responseTimeMs: result.responseTimeMs,
      metadata: { url, httpStatus: result.httpStatus, required },
    };
  }

  private async emailCheck(): Promise<SystemCheck> {
    const hasApiKey = Boolean(this.config.get<string>("RESEND_API_KEY"));
    const hasFrom = Boolean(this.config.get<string>("EMAIL_FROM"));
    const hasSupport = Boolean(this.config.get<string>("SUPPORT_EMAIL"));
    return {
      key: "emails",
      label: "Emails",
      status: hasApiKey && hasFrom && hasSupport ? "ok" : "warning",
      message: hasApiKey && hasFrom && hasSupport ? "Email transaccional configurado" : "Email transaccional incompleto o deshabilitado",
      metadata: { provider: "Resend", hasApiKey, hasFrom, hasSupport },
    };
  }

  private async sslCheck(): Promise<SystemCheck> {
    const urls = [
      this.config.get<string>("FRONTEND_URL"),
      this.config.get<string>("CUSTOMER_APP_URL"),
      this.config.get<string>("COMMERCE_APP_URL"),
      this.config.get<string>("CASHIER_APP_URL"),
      this.config.get<string>("ADMIN_APP_URL"),
      this.config.get<string>("API_URL"),
    ].filter(Boolean) as string[];
    if (!urls.length) return { key: "ssl", label: "SSL", status: "warning", message: "No hay URLs para validar SSL" };
    const nonHttps = urls.filter((url) => !url.startsWith("https://"));
    return {
      key: "ssl",
      label: "SSL",
      status: nonHttps.length ? "warning" : "ok",
      message: nonHttps.length ? "Existen URLs sin HTTPS configuradas" : "Todas las URLs configuradas usan HTTPS",
      metadata: { checkedUrls: urls.length, nonHttps },
    };
  }

  private async lastDeployCheck(): Promise<SystemCheck> {
    const deploymentId = this.config.get<string>("RAILWAY_DEPLOYMENT_ID") ?? this.config.get<string>("VERCEL_DEPLOYMENT_ID") ?? this.config.get<string>("GITHUB_RUN_ID");
    return {
      key: "lastDeploy",
      label: "Último Deploy",
      status: deploymentId ? "ok" : "unknown",
      message: deploymentId ? "Metadatos de deploy detectados" : "No hay ID de deploy disponible en variables",
      metadata: { deploymentId: this.redact(deploymentId) },
    };
  }

  private async environmentCheck(): Promise<SystemCheck> {
    const env = this.environment();
    return {
      key: "environment",
      label: "Ambiente",
      status: env === "production" || env === "staging" ? "ok" : "warning",
      message: `Ambiente actual: ${env}`,
      metadata: { environment: env },
    };
  }

  private async commitCheck(): Promise<SystemCheck> {
    const commit = this.commit();
    return {
      key: "commit",
      label: "Commit desplegado",
      status: commit === "unknown" ? "unknown" : "ok",
      message: commit === "unknown" ? "Commit no informado por el proveedor" : `Commit ${commit.slice(0, 8)}`,
      metadata: { commit },
    };
  }

  private async versionCheck(): Promise<SystemCheck> {
    return {
      key: "version",
      label: "Versión",
      status: "ok",
      message: `Versión ${this.version()}`,
      metadata: { ...this.versionInfo() },
    };
  }

  private async buildDateCheck(): Promise<SystemCheck> {
    return {
      key: "buildDate",
      label: "Fecha de compilación",
      status: BUILD_STARTED_AT ? "ok" : "unknown",
      message: BUILD_STARTED_AT ? BUILD_STARTED_AT : "Fecha de build no disponible",
      metadata: { buildTime: BUILD_STARTED_AT },
    };
  }

  private async playwrightCheck(): Promise<SystemCheck> {
    const stored = await this.prisma.systemSetting.findUnique({ where: { key: "last_playwright_run" } }).catch(() => null);
    const metadata = stored?.value && typeof stored.value === "object" ? stored.value as Record<string, any> : {};
    const status = this.statusFromString(metadata.status ?? this.config.get<string>("LAST_PLAYWRIGHT_STATUS", "unknown"));
    return {
      key: "playwright",
      label: "Ultima ejecucion Playwright",
      status: status === "unknown" ? "warning" : status,
      message: status === "ok" ? "Ultima ejecucion Playwright exitosa" : "Ultima ejecucion Playwright no informada o fallida",
      metadata: {
        runId: metadata.runId ?? this.config.get<string>("LAST_PLAYWRIGHT_RUN_ID", "unknown"),
        runUrl: metadata.runUrl ?? this.config.get<string>("LAST_PLAYWRIGHT_RUN_URL", ""),
        executedAt: metadata.executedAt ?? this.config.get<string>("LAST_PLAYWRIGHT_RUN_AT", "unknown"),
        commit: metadata.commit ?? this.config.get<string>("LAST_PLAYWRIGHT_COMMIT", "unknown"),
        environment: metadata.environment ?? this.environment(),
      },
    };
  }

  private async pingUrl(url: string, timeoutMs: number): Promise<{ status: SystemCheckStatus; message: string; responseTimeMs: number; httpStatus?: number }> {
    const startedAt = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        method: "GET",
        signal: controller.signal,
        headers: this.config.get<string>("VERCEL_AUTOMATION_BYPASS_SECRET")
          ? {
              "x-vercel-protection-bypass": this.config.get<string>("VERCEL_AUTOMATION_BYPASS_SECRET") as string,
              "x-vercel-set-bypass-cookie": "true",
            }
          : undefined,
      });
      return {
        status: response.status >= 500 ? "error" : response.status >= 400 ? "warning" : "ok",
        message: response.status >= 500
          ? `No responde correctamente (${response.status})`
          : response.status >= 400
            ? `Alcanzable con advertencia HTTP ${response.status}`
            : `Alcanzable HTTP ${response.status}`,
        responseTimeMs: Date.now() - startedAt,
        httpStatus: response.status,
      };
    } catch (error) {
      return {
        status: "error",
        message: `No alcanzable: ${this.safeError(error)}`,
        responseTimeMs: Date.now() - startedAt,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  private versionInfo(): VersionInfo {
    return {
      version: this.version(),
      commit: this.commit(),
      branch: this.branch(),
      buildNumber: this.buildNumber(),
      buildTime: BUILD_STARTED_AT,
      generatedAt: new Date().toISOString(),
    };
  }

  private deploymentInfo(environment: string): DeploymentInfo {
    return {
      provider: this.provider(),
      repository: this.config.get<string>("RAILWAY_GIT_REPO_NAME")
        ?? this.config.get<string>("GITHUB_REPOSITORY")
        ?? this.config.get<string>("VERCEL_GIT_REPO_SLUG")
        ?? "unknown",
      branch: this.branch(),
      commit: this.commit(),
      environment,
      service: this.config.get<string>("RAILWAY_SERVICE_NAME") ?? this.config.get<string>("VERCEL_PROJECT_NAME") ?? "miclub-api",
      deploymentId: this.config.get<string>("RAILWAY_DEPLOYMENT_ID") ?? this.config.get<string>("VERCEL_DEPLOYMENT_ID") ?? "unknown",
    };
  }

  private provider() {
    if (this.config.get<string>("RAILWAY_ENVIRONMENT") || this.config.get<string>("RAILWAY_SERVICE_ID")) return "Railway";
    if (this.config.get<string>("VERCEL") || this.config.get<string>("VERCEL_ENV")) return "Vercel";
    if (this.config.get<string>("GITHUB_ACTIONS")) return "GitHub Actions";
    return "Local/Unknown";
  }

  private version() {
    return this.config.get<string>("APP_VERSION") ?? this.config.get<string>("npm_package_version") ?? this.packageVersion();
  }

  private packageVersion() {
    try {
      const raw = readFileSync(join(process.cwd(), "package.json"), "utf8");
      return (JSON.parse(raw) as { version?: string }).version ?? "unknown";
    } catch {
      return "unknown";
    }
  }

  private commit() {
    return this.config.get<string>("RAILWAY_GIT_COMMIT_SHA")
      ?? this.config.get<string>("VERCEL_GIT_COMMIT_SHA")
      ?? this.config.get<string>("GITHUB_SHA")
      ?? this.config.get<string>("GIT_COMMIT_SHA")
      ?? this.config.get<string>("SOURCE_VERSION")
      ?? "unknown";
  }

  private branch() {
    return this.config.get<string>("RAILWAY_GIT_BRANCH")
      ?? this.config.get<string>("VERCEL_GIT_COMMIT_REF")
      ?? this.config.get<string>("GITHUB_REF_NAME")
      ?? this.config.get<string>("GIT_BRANCH")
      ?? "unknown";
  }

  private environment() {
    return this.config.get<string>("APP_ENV")
      ?? this.config.get<string>("NODE_ENV")
      ?? "development";
  }

  private buildNumber() {
    return this.config.get<string>("BUILD_NUMBER")
      ?? this.config.get<string>("GITHUB_RUN_NUMBER")
      ?? this.config.get<string>("RAILWAY_DEPLOYMENT_ID")
      ?? this.config.get<string>("VERCEL_GIT_COMMIT_SHA")
      ?? "unknown";
  }

  private memoryInfo() {
    const memory = process.memoryUsage();
    const mb = (value: number) => Math.round((value / 1024 / 1024) * 10) / 10;
    return {
      rssMb: mb(memory.rss),
      heapUsedMb: mb(memory.heapUsed),
      heapTotalMb: mb(memory.heapTotal),
      externalMb: mb(memory.external),
    };
  }

  private statusFromString(value: string): SystemCheckStatus {
    const normalized = value.toLowerCase();
    if (["ok", "success", "passed", "pass"].includes(normalized)) return "ok";
    if (["warning", "warn", "skipped"].includes(normalized)) return "warning";
    if (["error", "failed", "failure", "down"].includes(normalized)) return "error";
    return "unknown";
  }

  private safeError(error: unknown) {
    if (error instanceof Error) return error.name;
    return "UnknownError";
  }

  private redact(value?: string) {
    if (!value) return "unknown";
    if (value.length <= 8) return "configured";
    return `${value.slice(0, 4)}…${value.slice(-4)}`;
  }
}
