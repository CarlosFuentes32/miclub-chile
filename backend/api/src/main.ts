import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import cookieParser = require("cookie-parser");
import { AppModule } from "./app.module";
import { ObservabilityService } from "./observability/observability.service";
import { EnterpriseExceptionFilter } from "./enterprise-logging/enterprise-exception.filter";
import { RequestContextMiddleware } from "./enterprise-logging/request-context.service";
import { StructuredLoggerService } from "./enterprise-logging/structured-logger.service";
import { CsrfOriginMiddleware, DistributedRateLimitMiddleware, SecurityHeadersMiddleware } from "./security/security.middleware";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const observability = app.get(ObservabilityService);
  const requestContext = app.get(RequestContextMiddleware);
  const logger = app.get(StructuredLoggerService);
  const securityHeaders = app.get(SecurityHeadersMiddleware);
  const csrfOrigin = app.get(CsrfOriginMiddleware);
  const distributedRateLimit = app.get(DistributedRateLimitMiddleware);
  const origins = config
    .get<string>("CORS_ORIGIN", "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const isStaging = config.get<string>("NODE_ENV", "development") === "staging";
  const allowVercelPreviews = config.get<string>("ALLOW_VERCEL_PREVIEWS") === "true";

  app
    .getHttpAdapter()
    .get(
      "/health",
      async (_request: unknown, response: { json: (body: unknown) => void }) => {
        response.json(await observability.getEnterpriseHealth());
      },
    );
  app
    .getHttpAdapter()
    .get(
      "/health/live",
      async (_request: unknown, response: { json: (body: unknown) => void }) => {
        response.json(observability.getLiveness());
      },
    );
  app
    .getHttpAdapter()
    .get(
      "/health/ready",
      async (_request: unknown, response: { status: (code: number) => { json: (body: unknown) => void }; json: (body: unknown) => void }) => {
        const readiness = await observability.getReadiness();
        if (readiness.status !== "ready") return response.status(503).json(readiness);
        return response.json(readiness);
      },
    );

  app.setGlobalPrefix("api");
  app.use((request: any, response: any, next: () => void) => requestContext.use(request, response, next));
  app.use((request: any, response: any, next: () => void) => securityHeaders.use(request, response, next));
  app.use((request: any, response: any, next: () => void) => csrfOrigin.use(request, response, next));
  app.use((request: any, response: any, next: () => void) => void distributedRateLimit.use(request, response, next));
  app.use((request: any, response: any, next: () => void) => {
    const startedAt = Date.now();
    response.on("finish", () => {
      logger.info("http", "request_completed", {
        method: request.method,
        endpoint: request.originalUrl ?? request.url,
        statusCode: response.statusCode,
        durationMs: Date.now() - startedAt,
      });
    });
    next();
  });
  app.use(cookieParser());
  const rateLimit = new Map<string, { count: number; resetAt: number }>();
  app.use((request: any, response: any, next: () => void) => {
    const monitoringToken = config.get<string>("MONITORING_TOKEN");
    if (
      isStaging
      && monitoringToken
      && monitoringToken.length >= 24
      && request.header?.("x-monitoring-token") === monitoringToken
    ) {
      return next();
    }
    const key = `${request.ip}:${request.path}`;
    const now = Date.now();
    const current = rateLimit.get(key);
    if (!current || current.resetAt <= now) {
      rateLimit.set(key, { count: 1, resetAt: now + 60_000 });
      return next();
    }
    current.count += 1;
    if (current.count > 120) {
      return response
        .status(429)
        .json({ message: "Demasiadas solicitudes. Intenta nuevamente en un minuto." });
    }
    return next();
  });
  app.enableCors({
    origin: origins.length
      ? (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
          if (!origin || origins.includes(origin)) return callback(null, true);
          if (isStaging && allowVercelPreviews) {
            try {
              const host = new URL(origin).hostname.toLowerCase();
              if (host.endsWith(".vercel.app")) return callback(null, true);
            } catch {
              return callback(null, false);
            }
          }
          return callback(null, false);
        }
      : false,
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(app.get(EnterpriseExceptionFilter));

  await app.listen(config.get<number>("PORT", 3000));
}

void bootstrap();
