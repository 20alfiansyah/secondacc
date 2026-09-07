import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: {
    product: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };

  const product = {
    id: 10,
    name: 'Kopi Susu Gula Aren',
    price: 20000,
    categoryId: 1,
    category: { name: 'Kopi' },
    description: 'Espresso + fresh milk + gula aren',
    imageUrl: '/uploads/products/kopi-aren.webp',
    isAvailable: true,
    isRecommended: false,
    isBestSeller: true,
  };

  beforeEach(async () => {
    prisma = {
      product: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(ProductsService);
  });

  describe('findAll — filter katalog', () => {
    it('mengembalikan semua produk tanpa filter', async () => {
      prisma.product.findMany.mockResolvedValue([product]);
      const result = await service.findAll({});
      expect(result).toHaveLength(1);
      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
    });

    it('memfilter berdasarkan categoryId', async () => {
      prisma.product.findMany.mockResolvedValue([product]);
      await service.findAll({ categoryId: '1' });
      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ categoryId: 1 }),
        }),
      );
    });

    it('memfilter search berdasarkan nama (case-insensitive, contains)', async () => {
      prisma.product.findMany.mockResolvedValue([product]);
      await service.findAll({ search: 'kopi' });
      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: { contains: 'kopi', mode: 'insensitive' },
          }),
        }),
      );
    });

    it('memfilter isAvailable', async () => {
      prisma.product.findMany.mockResolvedValue([]);
      await service.findAll({ isAvailable: 'true' });
      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isAvailable: true }),
        }),
      );
    });

    it('memfilter isRecommended', async () => {
      prisma.product.findMany.mockResolvedValue([]);
      await service.findAll({ isRecommended: 'true' });
      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isRecommended: true }),
        }),
      );
    });

    it('memfilter isBestSeller', async () => {
      prisma.product.findMany.mockResolvedValue([]);
      await service.findAll({ isBestSeller: 'true' });
      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isBestSeller: true }),
        }),
      );
    });

    it('merangkai beberapa filter sekaligus', async () => {
      prisma.product.findMany.mockResolvedValue([]);
      await service.findAll({ search: 'kopi', isAvailable: 'true' });
      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isAvailable: true,
            name: { contains: 'kopi', mode: 'insensitive' },
          }),
        }),
      );
    });
  });

  describe('toggleAvailability', () => {
    it('membalik isAvailable dari true ke false', async () => {
      prisma.product.findUnique.mockResolvedValue(product);
      prisma.product.update.mockResolvedValue({ ...product, isAvailable: false });

      const result = await service.toggleAvailability(10);
      expect(result.isAvailable).toBe(false);
      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { isAvailable: false },
      });
    });

    it('membalik isAvailable dari false ke true', async () => {
      prisma.product.findUnique.mockResolvedValue({ ...product, isAvailable: false });
      prisma.product.update.mockResolvedValue({ ...product, isAvailable: true });

      const result = await service.toggleAvailability(10);
      expect(result.isAvailable).toBe(true);
    });

    it('melempar NotFoundException saat produk tidak ada', async () => {
      prisma.product.findUnique.mockResolvedValue(null);
      await expect(service.toggleAvailability(999)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
