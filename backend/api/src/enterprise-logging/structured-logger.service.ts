import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { RequestContextService } from "./request-context.service";
import { sanitizeJson, sanitizeText } from "./sensitive-data";

export type LogLevel = "debug" | "info" | "warn" | "error" | "security" | "audit";

@Injectable()
export class StructuredLoggerService {
  constructor(
    private readonly config: ConfigService,
    private readonly context: RequestContextService,
  ) {}

  log(level: LogLevel, module: string, message: string, metadata: Record<string, unknown> = {}) {
    if (level === "debug" && this.config.get<string>("NODE_ENV") === "production") return;
    const store = this.context.get();
    const request = store?.request;
    const user = request?.user;
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      environment: this.environment(),
      service: "miclub-api",
      module,
      message: sanitizeText(message, 500),
      requestId: store?.requestId,
      correlationId: store?.correlationId,
      method: request?.method,
      endpoint: request?.originalUrl ?? request?.url,
      userId: user?.id,
      role: user?.role,
      businessId: user?.businessId,
      version: this.version(),
      commit: this.commit(),
      buildNumber: this.buildNumber(),
      deploymentProvider: this.config.get<string>("DEPLOYMENT_PROVIDER") ?? this.config.get<string>("RAILWAY_SERVICE_NAME") ? "railway" : "local",
      metadata: sanitizeJson(metadata),
    };
    process.stdout.write(`${JSON.stringify(entry)}\n`);
  }

  debug(module: string, message: string, metadata?: Record<string, unknown>) { this.log("debug", module, message, metadata); }
  info(module: string, message: string, metadata?: Record<string, unknown>) { this.log("info", module, message, metadata); }
  warn(module: string, message: string, metadata?: Record<string, unknown>) { this.log("warn", module, message, metadata); }
  error(module: string, message: string, metadata?: Record<string, unknown>) { this.log("error", module, message, metadata); }
  security(module: string, message: string, metadata?: Record<string, unknown>) { this.log("security", module, message, metadata); }
  audit(module: string, message: string, metadata?: Record<string, unknown>) { this.log("audit", module, message, metadata); }

  environment() {
    return this.config.get<string>("APP_ENV") ?? this.config.get<string>("NODE_ENV", "development");
  }

  version() {
    return this.config.get<string>("RELEASE_VERSION") ?? this.config.get<string>("APP_VERSION") ?? "1.1.0";
  }

  commit() {
    return this.config.get<string>("RELEASE_COMMIT")
      ?? this.config.get<string>("RAILWAY_GIT_COMMIT_SHA")
      ?? this.config.get<string>("GIT_COMMIT_SHA")
      ?? "unknown";
  }

  buildNumber() {
    return this.config.get<string>("BUILD_NUMBER") ?? this.config.get<string>("RAILWAY_DEPLOYMENT_ID") ?? "local";
  }
}

