import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    // Connect to database if DATABASE_URL is reachable
    try {
      await this.$connect();
      console.log('✅ Connected to PostgreSQL database successfully.');
    } catch (error) {
      console.warn('⚠️ Warning: Could not connect to PostgreSQL immediately. Make sure PostgreSQL is running.');
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
