import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { PaymentChannelsService, PaymentChannelFilter } from './payment-channels.service';
import { CreatePaymentChannelDto } from './dto/payment-channel.dto';

@Controller('payment-channels')
export class PaymentChannelsController {
  constructor(private readonly paymentChannelsService: PaymentChannelsService) {}

  /** Kasir & Admin — cukup login. */
  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@Query('isActive') isActive?: string) {
    const filter: PaymentChannelFilter = { isActive };
    return this.paymentChannelsService.findAll(filter).then((data) => ({ success: true, data }));
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async create(@Body() dto: CreatePaymentChannelDto) {
    const data = await this.paymentChannelsService.create(dto);
    return { success: true, data };
  }

  @Patch(':id/toggle')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async toggle(@Param('id', ParseIntPipe) id: number) {
    const data = await this.paymentChannelsService.toggle(id);
    return { success: true, data };
  }
}
