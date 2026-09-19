import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PaymentChannelsService } from './payment-channels.service';
import { PaymentChannelsController } from './payment-channels.controller';

@Module({
  imports: [AuthModule],
  controllers: [PaymentChannelsController],
  providers: [PaymentChannelsService],
  exports: [PaymentChannelsService],
})
export class PaymentChannelsModule {}
