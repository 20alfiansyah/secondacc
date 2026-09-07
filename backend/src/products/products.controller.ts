import { Controller, Get, Param, ParseIntPipe, Patch, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProductsService, ProductFilter } from './products.service';

@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(
    @Query('categoryId') categoryId?: string,
    @Query('search') search?: string,
    @Query('isAvailable') isAvailable?: string,
    @Query('isRecommended') isRecommended?: string,
    @Query('isBestSeller') isBestSeller?: string,
  ) {
    const filter: ProductFilter = { categoryId, search, isAvailable, isRecommended, isBestSeller };
    return this.productsService.findAll(filter).then((data) => ({ success: true, data }));
  }

  @Patch(':id/toggle-availability')
  async toggleAvailability(@Param('id', ParseIntPipe) id: number) {
    const data = await this.productsService.toggleAvailability(id);
    return { success: true, data };
  }
}
