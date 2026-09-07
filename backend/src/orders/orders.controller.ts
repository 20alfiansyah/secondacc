import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  CheckoutInput,
  OpenBillInput,
  OrdersService,
} from './orders.service';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('open-bill')
  async openBill(@Body() body: OpenBillInput) {
    const data = await this.ordersService.openBill(body);
    return { success: true, data };
  }

  @Get('active')
  async getActive() {
    const data = await this.ordersService.getActive();
    return { success: true, data };
  }

  @Post(':id/checkout')
  async checkout(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CheckoutInput,
  ) {
    const data = await this.ordersService.checkout(id, body);
    return { success: true, data };
  }

  @Get('history')
  async history(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('search') search?: string,
  ) {
    const data = await this.ordersService.history({ from, to, search });
    return { success: true, data };
  }
}
