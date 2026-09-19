import { Test } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import * as fsPromises from 'fs/promises';
import * as path from 'path';
import { ProductsService } from './products.service';
import { PrismaService } from '../prisma/prisma.service';

jest.mock('fs/promises', () => ({ rm: jest.fn() }));

describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: {
    product: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    category: { findUnique: jest.Mock };
    orderItem: { count: jest.Mock };
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

  const imageFile = {
    fieldname: 'image',
    originalname: 'kopi.png',
    mimetype: 'image/png',
    filename: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d.png',
    path: 'uploads/products/a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d.png',
    size: 1024,
  } as Express.Multer.File;

  beforeEach(async () => {
    prisma = {
      product: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      category: {
        findUnique: jest.fn(),
      },
      orderItem: {
        count: jest.fn(),
      },
    };
    (fsPromises.rm as jest.Mock).mockClear();

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

  describe('create — POST /api/products (2.2B)', () => {
    it('membuat produk dengan gambar dan menyusun imageUrl dari filename Multer', async () => {
      prisma.category.findUnique.mockResolvedValue({ id: 1, name: 'Kopi' });
      prisma.product.create.mockResolvedValue({
        ...product,
        id: 11,
        name: 'Caramel Macchiato',
        imageUrl: `/uploads/products/${imageFile.filename}`,
      });

      const result = await service.create(
        { name: 'Caramel Macchiato', price: 25000, categoryId: 1 },
        imageFile,
      );

      expect(result.imageUrl).toBe(`/uploads/products/${imageFile.filename}`);
      expect(prisma.product.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Caramel Macchiato',
          price: 25000,
          categoryId: 1,
          imageUrl: `/uploads/products/${imageFile.filename}`,
        }),
        include: { category: { select: { name: true } } },
      });
    });

    it('membuat produk tanpa gambar (imageUrl null)', async () => {
      prisma.category.findUnique.mockResolvedValue({ id: 1, name: 'Kopi' });
      prisma.product.create.mockResolvedValue({ ...product, imageUrl: null });

      await service.create({ name: 'Es Kopi', price: 18000, categoryId: 1 });

      expect(prisma.product.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ imageUrl: null }),
        include: { category: { select: { name: true } } },
      });
    });

    it('mengonversi flag multipart string "true" ke boolean', async () => {
      prisma.category.findUnique.mockResolvedValue({ id: 1, name: 'Kopi' });
      prisma.product.create.mockResolvedValue(product);

      await service.create({
        name: 'Matcha Latte',
        price: 22000,
        categoryId: 1,
        isRecommended: 'true',
        isBestSeller: 'false',
      });

      expect(prisma.product.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          isRecommended: true,
          isBestSeller: false,
        }),
        include: { category: { select: { name: true } } },
      });
    });

    it('melempar 400 INVALID_CATEGORY_ID saat kategori tidak ada', async () => {
      prisma.category.findUnique.mockResolvedValue(null);

      await expect(
        service.create({ name: 'Americano', price: 15000, categoryId: 999 }),
      ).rejects.toMatchObject({ response: { code: 'INVALID_CATEGORY_ID' } });
      expect(prisma.product.create).not.toHaveBeenCalled();
    });
  });

  describe('update — PUT /api/products/:id (2.2B)', () => {
    it('memperbarui produk dan menghapus file gambar lama saat upload gambar baru', async () => {
      prisma.product.findUnique.mockResolvedValue(product);
      prisma.category.findUnique.mockResolvedValue({ id: 2, name: 'Mocktails' });
      prisma.product.update.mockResolvedValue({
        ...product,
        name: 'Virgin Mojito',
        price: 24000,
        imageUrl: `/uploads/products/${imageFile.filename}`,
      });

      const result = await service.update(
        10,
        { name: 'Virgin Mojito', price: 24000, categoryId: 2 },
        imageFile,
      );

      expect(result.imageUrl).toBe(`/uploads/products/${imageFile.filename}`);
      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: expect.objectContaining({
          name: 'Virgin Mojito',
          price: 24000,
          categoryId: 2,
          imageUrl: `/uploads/products/${imageFile.filename}`,
        }),
        include: { category: { select: { name: true } } },
      });
      expect(fsPromises.rm).toHaveBeenCalledWith(
        path.join(process.cwd(), 'uploads', 'products', 'kopi-aren.webp'),
      );
    });

    it('tidak menyentuh disk saat update tanpa gambar baru', async () => {
      prisma.product.findUnique.mockResolvedValue(product);
      prisma.product.update.mockResolvedValue(product);

      await service.update(10, { name: 'Nama Baru' });

      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: expect.objectContaining({ name: 'Nama Baru' }),
        include: { category: { select: { name: true } } },
      });
      expect(fsPromises.rm).not.toHaveBeenCalled();
    });

    it('melempar 404 PRODUCT_NOT_FOUND saat produk tidak ada', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(
        service.update(999, { name: 'Hantu' }),
      ).rejects.toMatchObject({ response: { code: 'PRODUCT_NOT_FOUND' } });
    });

    it('melempar 400 INVALID_CATEGORY_ID saat kategori baru tidak ada', async () => {
      prisma.product.findUnique.mockResolvedValue(product);
      prisma.category.findUnique.mockResolvedValue(null);

      await expect(
        service.update(10, { categoryId: 999 }),
      ).rejects.toMatchObject({ response: { code: 'INVALID_CATEGORY_ID' } });
      expect(prisma.product.update).not.toHaveBeenCalled();
    });
  });

  describe('remove — DELETE /api/products/:id (2.2B)', () => {
    it('hard delete produk belum terpakai beserta file gambarnya', async () => {
      prisma.product.findUnique.mockResolvedValue(product);
      prisma.orderItem.count.mockResolvedValue(0);
      prisma.product.delete.mockResolvedValue(product);

      const result = await service.remove(10);

      expect(result).toEqual({ id: 10 });
      expect(prisma.orderItem.count).toHaveBeenCalledWith({
        where: { productId: 10 },
      });
      expect(prisma.product.delete).toHaveBeenCalledWith({ where: { id: 10 } });
      expect(fsPromises.rm).toHaveBeenCalledWith(
        path.join(process.cwd(), 'uploads', 'products', 'kopi-aren.webp'),
      );
    });

    it('tidak menghapus file saat produk tanpa gambar', async () => {
      prisma.product.findUnique.mockResolvedValue({ ...product, imageUrl: null });
      prisma.orderItem.count.mockResolvedValue(0);
      prisma.product.delete.mockResolvedValue({ ...product, imageUrl: null });

      const result = await service.remove(10);

      expect(result).toEqual({ id: 10 });
      expect(fsPromises.rm).not.toHaveBeenCalled();
    });

    it('melempar 409 PRODUCT_IN_USE saat produk sudah dipakai di OrderItem', async () => {
      prisma.product.findUnique.mockResolvedValue(product);
      prisma.orderItem.count.mockResolvedValue(3);

      await expect(service.remove(10)).rejects.toMatchObject({
        response: { code: 'PRODUCT_IN_USE' },
      });
      expect(prisma.product.delete).not.toHaveBeenCalled();
      expect(fsPromises.rm).not.toHaveBeenCalled();
    });

    it('melempar 404 PRODUCT_NOT_FOUND saat produk tidak ada', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toMatchObject({
        response: { code: 'PRODUCT_NOT_FOUND' },
      });
      expect(prisma.orderItem.count).not.toHaveBeenCalled();
    });
  });
});
