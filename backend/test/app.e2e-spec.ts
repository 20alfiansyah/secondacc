/**
 * E2E bootstrap test — menyalakan AppModule sungguhan (Prisma + JWT + Guard
 * nyata, TANPA mock) untuk menangkap kelas bug yang tidak terlihat oleh unit
 * test: salah wiring DI antar modul (mis. JwtAuthGuard dipakai tanpa import
 * AuthModule) yang membuat backend gagal start.
 *
 * WAJIB ada DATABASE_URL mengarah ke Postgres hidup:
 *   docker compose up -d postgres
 *   npx prisma db push
 *   npm run test:e2e
 */
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Backend bootstrap (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('boot tanpa error DI dan health endpoint hidup', async () => {
    const res = await request(app.getHttpServer()).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('guard chain terpasang: endpoint terproteksi menolak tanpa token (401)', async () => {
    const res = await request(app.getHttpServer()).get('/api/products');
    expect(res.status).toBe(401);
  });
});
