import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const categories = await this.prisma.category.findMany({
      include: {
        products: {
          where: { isAvailable: true },
          select: { id: true, isAvailable: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      // Hitung hanya produk dengan isAvailable=true (defensif terhadap hasil query)
      activeProductCount: c.products.filter((p) => p.isAvailable).length,
    }));
  }
}
