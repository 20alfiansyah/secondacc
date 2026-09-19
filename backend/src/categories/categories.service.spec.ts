import { Test } from '@nestjs/testing';
import { CategoriesService } from './categories.service';
import { PrismaService } from '../prisma/prisma.service';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let prisma: { category: { findMany: jest.Mock } };

  beforeEach(async () => {
    prisma = { category: { findMany: jest.fn() } };

    const moduleRef = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(CategoriesService);
  });

  it('mengembalikan daftar kategori dengan jumlah produk aktif (isAvailable=true)', async () => {
    prisma.category.findMany.mockResolvedValue([
      {
        id: 1,
        name: 'Coffee',
        slug: 'coffee',
        products: [{ id: 101 }, { id: 102 }],
      },
      {
        id: 2,
        name: 'Mocktails',
        slug: 'mocktails',
        products: [],
      },
    ]);

    const result = await service.findAll();

    // id 1: 2 produk aktif, id 2: 0
    expect(result).toEqual([
      { id: 1, name: 'Coffee', slug: 'coffee', activeProductCount: 2 },
      { id: 2, name: 'Mocktails', slug: 'mocktails', activeProductCount: 0 },
    ]);

    // pastikan query meng-include relasi products yang difilter isAvailable=true
    expect(prisma.category.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          products: expect.objectContaining({
            where: { isAvailable: true },
          }),
        }),
      }),
    );
  });
});
