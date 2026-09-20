import { randomUUID } from 'crypto';
import { extname, join } from 'path';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UnsupportedMediaTypeException,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { diskStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { ProductsService, ProductFilter } from './products.service';
import { CreateProductDto, UpdateProductDto } from './dto/products.dto';

/** Disk path folder upload produk (konsisten dengan products.service & uploads.module). */
const PRODUCTS_UPLOAD_DIR = join(process.cwd(), 'uploads', 'products');

const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp'];

/** Fallback ekstensi bila nama asli tanpa ekstensi (docs/4 §4.4: MIME JPEG/PNG/WEBP). */
const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

/**
 * Konfigurasi Multer (docs/4 §4.4): diskStorage folder uploads/products,
 * filename UUID v4 + ekstensi asli, hanya JPEG/PNG/WEBP, maks 2 MB.
 * diskStorage mem-buat folder otomatis (mkdirp). Gagal ukuran >2MB dipetakan
 * platform-express ke 413 PayloadTooLarge; tipe salah → 415 INVALID_FILE_TYPE.
 */
const imageUpload: MulterOptions = {
  storage: diskStorage({
    destination: PRODUCTS_UPLOAD_DIR,
    filename: (_req, file, cb) => {
      const ext = (extname(file.originalname) || EXT_BY_MIME[file.mimetype] || '').toLowerCase();
      cb(null, `${randomUUID()}${ext}`);
    },
  }),
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_IMAGE_MIME.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new UnsupportedMediaTypeException({
          code: 'INVALID_FILE_TYPE',
          message: 'File type must be JPEG, PNG, or WEBP',
        }),
        false,
      );
    }
  },
  limits: { fileSize: 2 * 1024 * 1024 },
};

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

  @Post()
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  @UseInterceptors(FileInterceptor('image', imageUpload))
  create(@Body() dto: CreateProductDto, @UploadedFile() image?: Express.Multer.File) {
    return this.productsService.create(dto, image).then((data) => ({ success: true, data }));
  }

  @Put(':id')
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  @UseInterceptors(FileInterceptor('image', imageUpload))
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return this.productsService.update(id, dto, image).then((data) => ({ success: true, data }));
  }

  @Delete(':id')
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  async remove(@Param('id', ParseIntPipe) id: number) {
    const data = await this.productsService.remove(id);
    return { success: true, data };
  }

  @Patch(':id/toggle-availability')
  async toggleAvailability(@Param('id', ParseIntPipe) id: number) {
    const data = await this.productsService.toggleAvailability(id);
    return { success: true, data };
  }
}
