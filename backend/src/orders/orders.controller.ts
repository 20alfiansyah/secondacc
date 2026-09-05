import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CheckoutDto, OpenBillDto } from './dto/orders.dto';
import { JwtAuthGuard, AuthenticatedRequest } from '../auth/jwt-auth.guard';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

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
    return this.ordersService.checkout(id, dto);
  }
}
