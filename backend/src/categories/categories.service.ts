import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Slug helper kategori — pendekatan sama dengan prisma/seed.ts (kebab-case). */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

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

  /**
   * POST /api/categories — buat kategori baru (admin).
   * Cek duplikat slug via findUnique (pola users.service) — bukan catch P2002:
   * pesan error 409 konsisten dan mudah dites. Race P2002 hanya mungkin pada
   * admin endpoint bertrafik rendah; jika terjadi akan 500 (diterima).
   */
  async create(dto: { name: string }) {
    const name = dto.name.trim();
    const slug = slugify(name);

    const existing = await this.prisma.category.findUnique({ where: { slug } });
    if (existing) {
      throw new ConflictException({
        code: 'SLUG_TAKEN',
        message: `Category "${name}" already exists`,
      });
    }

    return this.prisma.category.create({ data: { name, slug } });
  }

  /** PATCH /api/categories/:id — rename kategori (admin). */
  async rename(id: number, dto: { name: string }) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException({
        code: 'CATEGORY_NOT_FOUND',
        message: `Category with id ${id} not found`,
      });
    }

    const name = dto.name.trim();
    const slug = slugify(name);

    const existing = await this.prisma.category.findUnique({ where: { slug } });
    if (existing && existing.id !== id) {
      throw new ConflictException({
        code: 'SLUG_TAKEN',
        message: `Category "${name}" already exists`,
      });
    }

    return this.prisma.category.update({ where: { id }, data: { name, slug } });
  }

  /**
   * DELETE /api/categories/:id — hapus kategori (admin).
   * Ditolak 400 bila masih ada produk yang memakai kategori ini.
   */
  async remove(id: number) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException({
        code: 'CATEGORY_NOT_FOUND',
        message: `Category with id ${id} not found`,
      });
    }

    const productCount = await this.prisma.product.count({ where: { categoryId: id } });
    if (productCount > 0) {
      throw new BadRequestException(`Category still has ${productCount} product(s)`);
    }

    return this.prisma.category.delete({ where: { id } });
  }
}
