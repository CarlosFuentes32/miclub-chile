import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import cookieParser = require("cookie-parser");
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const origins = config
    .get<string>("CORS_ORIGIN", "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  app
    .getHttpAdapter()
    .get(
      "/health",
      (_request: unknown, response: { json: (body: unknown) => void }) => {
        response.json({
          status: "ok",
          service: "MiClub API",
          timestamp: new Date().toISOString(),
        });
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
          return callback(null, false);
        }
      : false,
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  await app.listen(config.get<number>("PORT", 3000));
}

void bootstrap();
