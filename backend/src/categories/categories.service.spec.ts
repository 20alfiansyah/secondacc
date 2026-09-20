import { Test } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { PrismaService } from '../prisma/prisma.service';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let prisma: {
    category: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    product: { count: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      category: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      product: { count: jest.fn() },
    };

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
        products: [{ isAvailable: true }, { isAvailable: true }, { isAvailable: false }],
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

  describe('create', () => {
    it('membuat kategori dengan slug kebab-case dari nama', async () => {
      prisma.category.findUnique.mockResolvedValue(null);
      prisma.category.create.mockResolvedValue({ id: 3, name: 'Dessert Bar', slug: 'dessert-bar' });

      const result = await service.create({ name: 'Dessert Bar' });

      // "Dessert Bar" -> slug "dessert-bar" (spasi jadi '-', lowercase)
      expect(prisma.category.create).toHaveBeenCalledWith({
        data: { name: 'Dessert Bar', slug: 'dessert-bar' },
      });
      expect(result).toEqual({ id: 3, name: 'Dessert Bar', slug: 'dessert-bar' });
    });

    it('menolak duplicate slug dengan ConflictException SLUG_TAKEN', async () => {
      prisma.category.findUnique.mockResolvedValue({ id: 1, name: 'Coffee', slug: 'coffee' });

      await expect(service.create({ name: '  Coffee  ' })).rejects.toBeInstanceOf(
        ConflictException,
      );
      // trim + slugify dijalankan sebelum cek duplikat
      expect(prisma.category.findUnique).toHaveBeenCalledWith({ where: { slug: 'coffee' } });
      expect(prisma.category.create).not.toHaveBeenCalled();
    });
  });

  describe('rename', () => {
    it('melempar ConflictException saat slug baru bentrok dengan kategori lain', async () => {
      prisma.category.findUnique
        .mockResolvedValueOnce({ id: 1, name: 'Coffee', slug: 'coffee' }) // find by id
        .mockResolvedValueOnce({ id: 2, name: 'Tea', slug: 'tea' }); // find by slug

      await expect(service.rename(1, { name: 'Tea' })).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.category.update).not.toHaveBeenCalled();
    });

    it('mengizinkan rename ke nama sama (slug milik kategori itu sendiri)', async () => {
      prisma.category.findUnique
        .mockResolvedValueOnce({ id: 1, name: 'Coffee', slug: 'coffee' })
        .mockResolvedValueOnce({ id: 1, name: 'Coffee', slug: 'coffee' });
      prisma.category.update.mockResolvedValue({ id: 1, name: 'Coffee', slug: 'coffee' });

      await expect(service.rename(1, { name: 'Coffee' })).resolves.toEqual({
        id: 1,
        name: 'Coffee',
        slug: 'coffee',
      });
      expect(prisma.category.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { name: 'Coffee', slug: 'coffee' },
      });
    });

    it('melempar NotFoundException saat id tidak ada', async () => {
      prisma.category.findUnique.mockResolvedValue(null);

      await expect(service.rename(99, { name: 'Tea' })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('menolak hapus dengan BadRequestException saat kategori masih punya produk', async () => {
      prisma.category.findUnique.mockResolvedValue({ id: 1, name: 'Coffee', slug: 'coffee' });
      prisma.product.count.mockResolvedValue(3);

      await expect(service.remove(1)).rejects.toMatchObject({
        constructor: BadRequestException,
        message: 'Category still has 3 product(s)',
      });
      await expect(service.remove(1)).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.category.delete).not.toHaveBeenCalled();
    });

    it('menghapus kategori yang kosong', async () => {
      prisma.category.findUnique.mockResolvedValue({ id: 2, name: 'Tea', slug: 'tea' });
      prisma.product.count.mockResolvedValue(0);
      prisma.category.delete.mockResolvedValue({ id: 2, name: 'Tea', slug: 'tea' });

      const result = await service.remove(2);

      // count produk dulu, baru delete — urutan guard penting
      expect(prisma.product.count).toHaveBeenCalledWith({ where: { categoryId: 2 } });
      expect(prisma.category.delete).toHaveBeenCalledWith({ where: { id: 2 } });
      expect(result).toEqual({ id: 2, name: 'Tea', slug: 'tea' });
    });

    it('melempar NotFoundException saat id tidak ada', async () => {
      prisma.category.findUnique.mockResolvedValue(null);

      await expect(service.remove(99)).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.product.count).not.toHaveBeenCalled();
    });
  });
});
