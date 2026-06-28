import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const origins = config.get<string>('CORS_ORIGIN', '').split(',').filter(Boolean);

  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.enableCors({ origin: origins.length ? origins : false, credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  await app.listen(config.get<number>('PORT', 3000));
}

void bootstrap();
