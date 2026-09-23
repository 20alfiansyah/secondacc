import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TargetsService } from './targets.service';
import { TargetsController } from './targets.controller';

@Module({
  imports: [AuthModule],
  controllers: [TargetsController],
  providers: [TargetsService],
  exports: [TargetsService],
})
export class TargetsModule {}
