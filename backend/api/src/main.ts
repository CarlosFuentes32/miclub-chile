import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import cookieParser = require("cookie-parser");
import { AppModule } from "./app.module";
import { ObservabilityService } from "./observability/observability.service";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const observability = app.get(ObservabilityService);
  const origins = config
    .get<string>("CORS_ORIGIN", "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const isStaging = config.get<string>("NODE_ENV", "development") === "staging";

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
  app.use(cookieParser());
  const rateLimit = new Map<string, { count: number; resetAt: number }>();
  app.use((request: any, response: any, next: () => void) => {
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
          if (isStaging) {
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

  await app.listen(config.get<number>("PORT", 3000));
}

void bootstrap();
