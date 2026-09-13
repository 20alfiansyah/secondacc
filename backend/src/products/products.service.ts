import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ProductFilter {
  categoryId?: string;
  search?: string;
  isAvailable?: string;
  isRecommended?: string;
  isBestSeller?: string;
}

/** Helper parse query string boolean ("true"/"false") ke boolean. */
function parseBool(value: string | undefined): boolean | undefined {
  if (value === undefined) return undefined;
  return value === 'true';
}

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(filter: ProductFilter) {
    const where: Record<string, unknown> = {};

    if (filter.categoryId) {
      const categoryId = Number(filter.categoryId);
      if (!Number.isInteger(categoryId)) {
        throw new BadRequestException({
          code: 'INVALID_CATEGORY_ID',
          message: `categoryId harus bilangan bulat: ${filter.categoryId}`,
        });
      }
      where.categoryId = categoryId;
    }
    if (filter.search) {
      where.name = { contains: filter.search, mode: 'insensitive' };
    }
    if (filter.isAvailable !== undefined) {
      where.isAvailable = parseBool(filter.isAvailable);
    }
    if (filter.isRecommended !== undefined) {
      where.isRecommended = parseBool(filter.isRecommended);
    }
    if (filter.isBestSeller !== undefined) {
      where.isBestSeller = parseBool(filter.isBestSeller);
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
        message: `Produk dengan id ${id} tidak ditemukan`,
      });
    }

    return this.prisma.product.update({
      where: { id },
      data: { isAvailable: !product.isAvailable },
    });
  }
}
