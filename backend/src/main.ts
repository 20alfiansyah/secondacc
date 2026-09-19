import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security headers standar (X-Frame-Options, CSP ringan, dsb).
  app.use(helmet());

  // Global prefix /api
  app.setGlobalPrefix('api');

  // CORS: origin dipatok lewat env CORS_ORIGIN (bisa dipisah koma untuk
  // beberapa origin). Jangan pakai '*' di produksi.
  const corsOrigin = app
    .get(ConfigService)
    .get<string>('CORS_ORIGIN', 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({
    origin: corsOrigin,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Global DTO Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = app.get(ConfigService).get<number>('PORT', 3000);
  await app.listen(port);
  const logger = new Logger('Bootstrap');
  logger.log(`🚀 Cafe POS Backend running on: http://localhost:${port}/api`);
  logger.log(`CORS origin diizinkan: ${corsOrigin.join(', ')}`);
}
bootstrap();
