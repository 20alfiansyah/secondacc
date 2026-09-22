import { randomUUID } from 'crypto';
import { extname, join } from 'path';
import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Put,
  Query,
  UploadedFile,
  UnsupportedMediaTypeException,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
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
@UseGuards(JwtAuthGuard, RolesGuard)
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

  /** GET /api/products/archived — daftar produk terarsip (khusus ADMIN). */
  @Get('archived')
  @Roles(Role.ADMIN)
  async findAllArchived() {
    const data = await this.productsService.findAllArchived();
    return { success: true, data };
  }

  @Roles(Role.ADMIN)
  @UseInterceptors(FileInterceptor('image', imageUpload))
  create(@Body() dto: CreateProductDto, @UploadedFile() image?: Express.Multer.File) {
    return this.productsService.create(dto, image).then((data) => ({ success: true, data }));
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  @UseInterceptors(FileInterceptor('image', imageUpload))
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return this.productsService.update(id, dto, image).then((data) => ({ success: true, data }));
  }

  /** PATCH /api/products/:id/archive — arsipkan produk; riwayat order tetap utuh (khusus ADMIN). */
  @Patch(':id/archive')
  @Roles(Role.ADMIN)
  async archive(@Param('id', ParseIntPipe) id: number) {
    const data = await this.productsService.archive(id);
    return { success: true, data };
  }

  /** PATCH /api/products/:id/restore — kembalikan produk terarsip (khusus ADMIN). */
  @Patch(':id/restore')
  @Roles(Role.ADMIN)
  async restore(@Param('id', ParseIntPipe) id: number) {
    const data = await this.productsService.restore(id);
    return { success: true, data };
  }

  // Sold out / tersedia = urusan menu & stok: ADMIN saja.
  @Roles(Role.ADMIN)
  @Patch(':id/toggle-availability')
  async toggleAvailability(@Param('id', ParseIntPipe) id: number) {
    const data = await this.productsService.toggleAvailability(id);
    return { success: true, data };
  }
}

