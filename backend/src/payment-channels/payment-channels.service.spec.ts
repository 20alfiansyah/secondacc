import { Test } from '@nestjs/testing';
import { PaymentChannelsService } from './payment-channels.service';
import { PrismaService } from '../prisma/prisma.service';

describe('PaymentChannelsService', () => {
  let service: PaymentChannelsService;
  let prisma: {
    paymentChannel: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };

  const channel = {
    id: 2,
    name: 'QRIS BCA',
    category: 'THIRD_PARTY',
    isActive: true,
  };

  beforeEach(async () => {
    prisma = {
      paymentChannel: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        PaymentChannelsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(PaymentChannelsService);
  });

  describe('findAll — list & filter isActive', () => {
    it('mengembalikan semua channel tanpa filter (halaman admin)', async () => {
      prisma.paymentChannel.findMany.mockResolvedValue([channel]);

      const result = await service.findAll({});

      expect(result).toEqual([channel]);
      expect(prisma.paymentChannel.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { id: 'asc' },
      });
    });

    it('memfilter isActive=true (POS hanya butuh channel aktif)', async () => {
      prisma.paymentChannel.findMany.mockResolvedValue([channel]);

      const result = await service.findAll({ isActive: 'true' });

      expect(result).toEqual([channel]);
      expect(prisma.paymentChannel.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { id: 'asc' },
      });
    });

    it('memfilter isActive=false', async () => {
      prisma.paymentChannel.findMany.mockResolvedValue([]);

      await service.findAll({ isActive: 'false' });

      expect(prisma.paymentChannel.findMany).toHaveBeenCalledWith({
        where: { isActive: false },
        orderBy: { id: 'asc' },
      });
    });
  });

  describe('create', () => {
    it('membuat channel baru dengan kategori valid', async () => {
      prisma.paymentChannel.create.mockResolvedValue({
        id: 4,
        name: 'ShopeePay QRIS',
        category: 'THIRD_PARTY',
        isActive: true,
      });

      const result = await service.create({
        name: 'ShopeePay QRIS',
        category: 'THIRD_PARTY',
      });

      expect(result).toEqual({
        id: 4,
        name: 'ShopeePay QRIS',
        category: 'THIRD_PARTY',
        isActive: true,
      });
      expect(prisma.paymentChannel.create).toHaveBeenCalledWith({
        data: { name: 'ShopeePay QRIS', category: 'THIRD_PARTY' },
      });
    });

    it('menolak kategori di luar enum dengan 400 INVALID_CATEGORY', async () => {
      await expect(
        service.create({ name: 'Bitcoin Pay', category: 'BITCOIN' }),
      ).rejects.toMatchObject({ response: { code: 'INVALID_CATEGORY' } });
      expect(prisma.paymentChannel.create).not.toHaveBeenCalled();
    });
  });

  describe('toggle', () => {
    it('membalik status isActive channel', async () => {
      prisma.paymentChannel.findUnique.mockResolvedValue(channel);
      prisma.paymentChannel.update.mockResolvedValue({
        ...channel,
        isActive: false,
      });

      const result = await service.toggle(2);

      expect(result).toEqual({ ...channel, isActive: false });
      expect(prisma.paymentChannel.findUnique).toHaveBeenCalledWith({
        where: { id: 2 },
      });
      expect(prisma.paymentChannel.update).toHaveBeenCalledWith({
        where: { id: 2 },
        data: { isActive: false },
      });
    });

    it('melempar 404 CHANNEL_NOT_FOUND jika channel tidak ada', async () => {
      prisma.paymentChannel.findUnique.mockResolvedValue(null);

      await expect(service.toggle(999)).rejects.toMatchObject({
        response: { code: 'CHANNEL_NOT_FOUND' },
      });
      expect(prisma.paymentChannel.update).not.toHaveBeenCalled();
    });
  });
});
