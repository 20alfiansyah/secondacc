import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    // Connect to database if DATABASE_URL is reachable
    try {
      await this.$connect();
      this.logger.log('✅ Connected to PostgreSQL database successfully.');
    } catch (error) {
      // Tidak melempar: app tetap start (DB mungkin baru siap beberapa detik
      // kemudian, mis. docker compose). Catat penyebabnya untuk diagnosa.
      this.logger.warn(
        `⚠️ Could not connect to PostgreSQL immediately: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
