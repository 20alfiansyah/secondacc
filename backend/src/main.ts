import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

// Support BigInt serialization in JSON responses
(BigInt.prototype as any).toJSON = function () {
  return Number(this);
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix /api
  app.setGlobalPrefix('api');

  // CORS: API memakai Bearer token (bukan cookie), jadi credentials TIDAK
  // diperlukan — kombinasi wildcard + credentials ditolak browser.
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  });

  // Global DTO Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 Cafe POS Backend running on: http://localhost:${port}/api`);
}
bootstrap();
