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
  app.enableCors({
    origin: origins.length ? origins : false,
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  await app.listen(config.get<number>("PORT", 3000));
}

void bootstrap();
