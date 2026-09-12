import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

// BigInt tidak punya toJSON bawaan — perluas prototipe agar JSON.stringify
// mengembalikan number (uang rupiah selalu integer aman JSON).
type BigIntWithToJSON = { toJSON: (this: bigint) => number };
const bigIntProto = BigInt.prototype as unknown as BigIntWithToJSON;
bigIntProto.toJSON = function (this: bigint) {
  return Number(this);
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix /api
  app.setGlobalPrefix('api');

  // Enable CORS for frontend
  app.enableCors({
    origin: '*',
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

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 Cafe POS Backend running on: http://localhost:${port}/api`);
}
bootstrap();
