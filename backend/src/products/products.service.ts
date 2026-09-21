import * as fs from 'fs/promises';
import * as path from 'path';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto, UpdateProductDto } from './dto/products.dto';

export interface ProductFilter {
  categoryId?: string;
  search?: string;
  isAvailable?: string;
  isRecommended?: string;
  isBestSeller?: string;
}

const UPLOADS_PRODUCTS_DIR = path.join(process.cwd(), 'uploads', 'products');

/**
 * Konversi boolean multipart ("true"/"false") atau boolean JSON ke boolean | undefined.
 * Meluaskan pola parseBool untuk DTO multipart (docs/8 §2.4).
 */
function toBool(value: string | boolean | undefined): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value === 'boolean') return value;
  return value === 'true';
}

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  /** GET /api/products — hanya produk aktif (isActive=false terarsip disembunyikan). */
  findAll(filter: ProductFilter) {
    const where: Record<string, unknown> = { isActive: true };

    if (filter.categoryId) {
      const categoryId = Number(filter.categoryId);
      if (!Number.isInteger(categoryId)) {
        throw new BadRequestException({
          code: 'INVALID_CATEGORY_ID',
          message: `categoryId must be an integer: ${filter.categoryId}`,
        });
      }
      where.categoryId = categoryId;
    }
    if (filter.search) {
      where.name = { contains: filter.search, mode: 'insensitive' };
    }
    if (filter.isAvailable !== undefined) {
      where.isAvailable = toBool(filter.isAvailable);
    }
    if (filter.isRecommended !== undefined) {
      where.isRecommended = toBool(filter.isRecommended);
    }
    if (filter.isBestSeller !== undefined) {
      where.isBestSeller = toBool(filter.isBestSeller);
    }

    return this.prisma.product.findMany({
      where,
      include: { category: { select: { name: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async toggleAvailability(id: number) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException({
        code: 'PRODUCT_NOT_FOUND',
        message: `Product with id ${id} not found`,
      });
    }

    return this.prisma.product.update({
      where: { id },
      data: { isAvailable: !product.isAvailable },
    });
  }

  /** Validasi kategori ada (400 INVALID_CATEGORY_ID) sebelum tulis ke DB. */
  private async ensureCategoryExists(categoryId: number) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });
    if (!category) {
      throw new BadRequestException({
        code: 'INVALID_CATEGORY_ID',
        message: `Category with id ${categoryId} not found`,
      });
    }
  }

  /**
   * Hapus file gambar dari disk berdasarkan imageUrl publik "/uploads/products/<file>".
   * basename() mencegah path traversal; ENOENT diabaikan (end-state sama: file sudah tiada).
   */
  private async deleteImageFile(imageUrl: string) {
    const filePath = path.join(UPLOADS_PRODUCTS_DIR, path.basename(imageUrl));
    try {
      await fs.rm(filePath);
    } catch (err) {
      if ((err as NodeJS.ErrnoException)?.code !== 'ENOENT') throw err;
    }
  }

  async create(dto: CreateProductDto, file?: Express.Multer.File) {
    await this.ensureCategoryExists(dto.categoryId);

    // File sudah tersimpan oleh Multer diskStorage (uuid v4 + ekstensi asli)
    // sebelum controller dieksekusi — service hanya menyusun URL publiknya.
    return this.prisma.product.create({
      data: {
        name: dto.name,
        price: dto.price,
        categoryId: dto.categoryId,
        description: dto.description ?? null,
        imageUrl: file ? `/uploads/products/${file.filename}` : null,
        isRecommended: toBool(dto.isRecommended) ?? false,
        isBestSeller: toBool(dto.isBestSeller) ?? false,
      },
      include: { category: { select: { name: true } } },
    });
  }

  async update(id: number, dto: UpdateProductDto, file?: Express.Multer.File) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException({
        code: 'PRODUCT_NOT_FOUND',
        message: `Product with id ${id} not found`,
      });
    }
    if (dto.categoryId !== undefined) {
      await this.ensureCategoryExists(dto.categoryId);
    }

    // undefined pada data Prisma = field tidak diubah.
    const data: Record<string, unknown> = {
      name: dto.name,
      price: dto.price,
      categoryId: dto.categoryId,
      description: dto.description,
      isRecommended: toBool(dto.isRecommended),
      isBestSeller: toBool(dto.isBestSeller),
    };
    if (file) {
      data.imageUrl = `/uploads/products/${file.filename}`;
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data,
      include: { category: { select: { name: true } } },
    });

    // Hapus file lama SETELAH DB sukses (DB gagal → file lama tetap utuh).
    if (file && product.imageUrl) {
      await this.deleteImageFile(product.imageUrl);
    }
    return updated;
  }

  /** GET /api/products/archived — hanya produk terarsip (isActive=false). */
  async findAllArchived() {
    return this.prisma.product.findMany({
      where: { isActive: false },
      include: { category: { select: { name: true } } },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * PATCH /api/products/:id/archive — arsipkan produk (soft-disable).
   * Tanpa 409: arsip justru untuk produk yang pernah masuk order. Gambar TIDAK
   * dihapus agar restore bisa menampilkan ulang produk apa adanya. Riwayat
   * transaksi immutable (AGENTS.md §3): OrderItem tetap menunjuk produk ini.
   */
  async archive(id: number) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException({
        code: 'PRODUCT_NOT_FOUND',
        message: `Product with id ${id} not found`,
      });
    }

    await this.prisma.product.update({
      where: { id },
      data: { isActive: false },
    });
    return { id: product.id, isActive: false };
  }

  /**
   * PATCH /api/products/:id/restore — kembalikan produk terarsip ke katalog.
   * Nama & kategori tidak berubah saat arsip, jadi restore aman tanpa konflik.
   */
  async restore(id: number) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException({
        code: 'PRODUCT_NOT_FOUND',
        message: `Product with id ${id} not found`,
      });
    }

    return this.prisma.product.update({
      where: { id },
      data: { isActive: true },
      include: { category: { select: { name: true } } },
    });
  }
}
