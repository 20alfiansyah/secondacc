import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard, JwtPayload } from '../auth/jwt-auth.guard';
import { OrdersService } from './orders.service';
import {
  CheckoutDto,
  OpenBillDto,
  UpdateOpenBillItemsDto,
} from './dto/orders.dto';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('open-bill')
  async openBill(@Body() body: OpenBillDto, @Req() req: Request) {
    const user = req.user as JwtPayload;
    const data = await this.ordersService.openBill(body, user.sub);
    return { success: true, data };
  }

  @Get('active')
  async getActive() {
    const data = await this.ordersService.getActive();
    return { success: true, data };
  }

  @Put(':id/items')
  async updateItems(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateOpenBillItemsDto,
  ) {
    const data = await this.ordersService.updateItems(id, body);
    return { success: true, data };
  }

  @Post(':id/checkout')
  async checkout(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CheckoutDto,
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

  @Get(':id')
  async getById(@Param('id', ParseIntPipe) id: number) {
    const data = await this.ordersService.getById(id);
    return { success: true, data };
  }
}
