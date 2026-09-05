import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ProductQuery {
  categoryId?: number;
  search?: string;
  isAvailable?: boolean;
}

export interface ProductDto {
  id: number;
  name: string;
  price: number;
  categoryId: number;
  categoryName: string;
  description: string | null;
  isAvailable: boolean;
}

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ProductQuery): Promise<ProductDto[]> {
    const { categoryId, search, isAvailable } = query;

    const products = await this.prisma.product.findMany({
      where: {
        ...(categoryId !== undefined ? { categoryId } : {}),
        ...(isAvailable !== undefined ? { isAvailable } : {}),
        ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
      },
      include: { category: true },
      orderBy: { id: 'asc' },
    });

    return products.map((product) => ({
      id: product.id,
      name: product.name,
      price: Number(product.price),
      categoryId: product.categoryId,
      categoryName: product.category.name,
      description: product.description,
      isAvailable: product.isAvailable,
    }));
  }

  async toggleAvailability(id: number): Promise<ProductDto> {
    const product = await this.prisma.product.findUnique({ where: { id } });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: { isAvailable: !product.isAvailable },
      include: { category: true },
    });

    return {
      id: updated.id,
      name: updated.name,
      price: Number(updated.price),
      categoryId: updated.categoryId,
      categoryName: updated.category.name,
      description: updated.description,
      isAvailable: updated.isAvailable,
    };
  }
}
