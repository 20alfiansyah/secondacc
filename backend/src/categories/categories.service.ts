import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
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

  /** Shared query daftar kategori — filter isActive; undefined = tanpa filter. */
  private async listByActive(isActive: boolean | undefined) {
    const categories = await this.prisma.category.findMany({
      // undefined = tanpa filter (includeArchived); true = aktif saja.
      where: isActive === undefined ? undefined : { isActive },
      include: {
        products: {
          where: { isAvailable: true },
          select: { id: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      activeProductCount: c.products.length,
    }));
  }

  /** GET /api/categories — default hanya kategori aktif (terarsip disembunyikan). */
  async findAll({ includeArchived = false }: { includeArchived?: boolean } = {}) {
    return this.listByActive(includeArchived ? undefined : true);
  }

  /** GET /api/categories/archived — hanya kategori terarsip (isActive=false). */
  async findAllArchived() {
    return this.listByActive(false);
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
   * PATCH /api/categories/:id/archive — arsipkan kategori (soft-disable).
   * Produk tetap menunjuk kategori ini (onDelete: Restrict): riwayat order
   * tidak tersentuh; isActive hanya memfilter listing (GET, pills, dropdown).
   */
  async archive(id: number) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException({
        code: 'CATEGORY_NOT_FOUND',
        message: `Category with id ${id} not found`,
      });
    }

    return this.prisma.category.update({ where: { id }, data: { isActive: false } });
  }

  /**
   * PATCH /api/categories/:id/restore — kembalikan kategori terarsip.
   * Slug tidak berubah saat arsip, jadi restore tidak mungkin bentrok slug.
   */
  async restore(id: number) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException({
        code: 'CATEGORY_NOT_FOUND',
        message: `Category with id ${id} not found`,
      });
    }

    return this.prisma.category.update({ where: { id }, data: { isActive: true } });
  }
}
