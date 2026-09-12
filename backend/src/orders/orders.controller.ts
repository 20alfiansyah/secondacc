import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CheckoutDto, OpenBillDto } from './dto/orders.dto';
import { JwtAuthGuard, AuthenticatedRequest } from '../auth/jwt-auth.guard';
import { OrderStatus } from '@prisma/client';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /** Daftar order; filter status opsional via query (OPEN_BILL / PAID). */
  @Get()
  async listOrders(@Query('status') status?: OrderStatus) {
    const orders = await this.ordersService.listOrders(status);
    return { success: true, orders };
  }

  /** Detail satu order (untuk panel ORDER DETAIL & re-print struk). */
  @Get(':id')
  async getOrderDetail(@Param('id', ParseIntPipe) id: number) {
    const order = await this.ordersService.getOrderDetail(id);
    return { success: true, order };
  }

  @Post('open-bill')
  async openBill(@Body() dto: OpenBillDto, @Req() req: AuthenticatedRequest) {
    const order = await this.ordersService.openBill(dto, req.user);
    return { success: true, order };
  }

  @Post(':id/checkout')
  async checkout(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CheckoutDto,
  ) {
    const { order } = await this.ordersService.checkout(id, dto);
    return { success: true, order };
  }

  /** Batalkan open bill + kosongkan meja (docs/6_API_CONTRACTS.md). */
  @Patch(':id/cancel')
  async cancel(@Param('id', ParseIntPipe) id: number) {
    const order = await this.ordersService.cancel(id);
    return {
      success: true,
      message: 'Pesanan berhasil dibatalkan dan meja telah dikosongkan.',
      order: { id: order.id, status: order.status },
    };
  }
}
