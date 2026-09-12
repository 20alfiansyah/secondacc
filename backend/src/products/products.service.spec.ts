import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { PrismaService } from '../prisma/prisma.service';

interface CategoryRow {
  id: number;
  name: string;
  slug: string;
}

function productRow(
  overrides: Partial<{
    id: number;
    name: string;
    price: bigint;
    categoryId: number;
    category: CategoryRow;
    description: string;
    imageUrl: string | null;
    isAvailable: boolean;
  }> = {},
) {
  return {
    id: 10,
    name: 'Nasi Goreng Spesial',
    price: BigInt(28000),
    categoryId: 2,
    category: { id: 2, name: 'Makanan Berat', slug: 'makanan-berat' },
    description: 'Nasi goreng telur + ayam suwir',
    imageUrl: null,
    isAvailable: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('ProductsService (list + filter + toggle availability)', () => {
  let service: ProductsService;
  let prisma: PrismaService;

  beforeAll(async () => {
    prisma = {
      product: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    } as unknown as PrismaService;

    const module: TestingModule = await Test.createTestingModule({
      providers: [ProductsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  describe('1. findAll -> memetakan produk + categoryName', () => {
    it('mengembalikan produk lengkap dengan categoryName & isAvailable', async () => {
      (prisma.product.findMany as jest.Mock).mockResolvedValue([
        productRow(),
        productRow({
          id: 11,
          name: 'Kopi Susu Gula Aren',
          price: BigInt(18000),
          categoryId: 1,
          category: { id: 1, name: 'Kopi', slug: 'kopi' },
          isAvailable: false,
        }),
      ]);

      const result = await service.findAll({});

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: 10,
        name: 'Nasi Goreng Spesial',
        price: 28000,
        categoryId: 2,
        isAvailable: true,
      });
      // categoryName diambil dari relasi category
      expect(result[0].categoryName).toBe('Makanan Berat');
      expect(result[1].categoryName).toBe('Kopi');
    });
  });

  it('findAll membangun filter dari categoryId, search, isAvailable', async () => {
    (prisma.product.findMany as jest.Mock).mockResolvedValue([]);

    await service.findAll({ categoryId: 2, search: 'nasi', isAvailable: true });

    const calls = (prisma.product.findMany as jest.Mock).mock.calls;
    const where = calls[calls.length - 1][0].where;
    expect(where.categoryId).toBe(2);
    expect(where.isAvailable).toBe(true);
    expect(where.name.contains).toBe('nasi');
    expect(where.name.mode).toBe('insensitive');
  });

  describe('2. toggleAvailability', () => {
    it('me-toggle status ke false (Sold Out) dan mengembalikan produk', async () => {
      (prisma.product.findUnique as jest.Mock).mockResolvedValue(productRow({ isAvailable: true }));
      (prisma.product.update as jest.Mock).mockResolvedValue(
        productRow({ isAvailable: false }),
      );

      const result = await service.toggleAvailability(10);

      expect(result).toMatchObject({ id: 10, isAvailable: false });
      expect(prisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 10 }, data: { isAvailable: false } }),
      );
    });

    it('melempar NotFoundException jika produk tidak ada', async () => {
      (prisma.product.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.toggleAvailability(999)).rejects.toThrow(NotFoundException);
    });
  });
});
