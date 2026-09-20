import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/categories.dto';

@Controller('categories')
@UseGuards(JwtAuthGuard)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  async findAll() {
    const data = await this.categoriesService.findAll();
    return { success: true, data };
  }

  /** GET /api/categories/archived — daftar kategori terarsip (khusus ADMIN). */
  @Get('archived')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async findAllArchived() {
    const data = await this.categoriesService.findAllArchived();
    return { success: true, data };
  }

  /** POST /api/categories — buat kategori (khusus ADMIN). */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async create(@Body() dto: CreateCategoryDto) {
    const data = await this.categoriesService.create(dto);
    return { success: true, data };
  }

  /** PATCH /api/categories/:id — rename kategori (khusus ADMIN). */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async rename(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCategoryDto) {
    const data = await this.categoriesService.rename(id, dto);
    return { success: true, data };
  }

  /** PATCH /api/categories/:id/archive — arsipkan kategori (khusus ADMIN). */
  @Patch(':id/archive')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async archive(@Param('id', ParseIntPipe) id: number) {
    const data = await this.categoriesService.archive(id);
    return { success: true, data };
  }

  /** PATCH /api/categories/:id/restore — kembalikan kategori terarsip (khusus ADMIN). */
  @Patch(':id/restore')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async restore(@Param('id', ParseIntPipe) id: number) {
    const data = await this.categoriesService.restore(id);
    return { success: true, data };
  }
}
