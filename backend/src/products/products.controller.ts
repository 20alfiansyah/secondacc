import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ProductsService } from './products.service';
@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  async findAll(
    @Query('category_id') categoryId?: string,
    @Query('search') search?: string,
    @Query('is_available') isAvailable?: string,
  ) {
    const data = await this.productsService.findAll({
      categoryId: categoryId !== undefined ? Number(categoryId) : undefined,
      search,
      isAvailable: isAvailable !== undefined ? isAvailable === 'true' : undefined,
    });

    return { success: true, data };
  }

  // Sold out / tersedia = urusan menu & stok: ADMIN atau INVENTORY.
  @Roles(Role.ADMIN, Role.INVENTORY)
  @Patch(':id/toggle-availability')
  async toggleAvailability(@Param('id', ParseIntPipe) id: number) {
    const data = await this.productsService.toggleAvailability(id);
    return { success: true, data };
  }
}
