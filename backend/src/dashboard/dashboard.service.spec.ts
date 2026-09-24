import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../prisma/prisma.service';

/** Baris order minim untuk agregasi (bentuk sama dengan select di service). */
const order = (customerGender: 'L' | 'P' | null, grandTotal: number, createdAt: string) => ({
  customerGender,
  grandTotal,
  createdAt: new Date(createdAt),
});

describe('DashboardService', () => {
  let service: DashboardService;
  let prisma: {
    order: { findMany: jest.Mock };
    orderItem: { findMany: jest.Mock };
    monthlyTarget: { findUnique: jest.Mock };
  };

  beforeEach(async () => {
    // Bekukan waktu sistem di 2026-09-23T10:00Z — bulan berjalan (tz UTC) = September 2026,
    // jendela 7 hari default = 2026-09-17 s.d. 2026-09-23.
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-09-23T10:00:00Z'));

    prisma = {
      order: { findMany: jest.fn() },
      orderItem: { findMany: jest.fn() },
      monthlyTarget: { findUnique: jest.fn() },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [DashboardService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(DashboardService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('menghitung hanya order PAID (filter status di where)', async () => {
    prisma.order.findMany.mockResolvedValue([]);
    prisma.orderItem.findMany.mockResolvedValue([]);
    prisma.monthlyTarget.findUnique.mockResolvedValue(null);

    await service.getOverview();

    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'PAID' }),
      }),
    );
    expect(prisma.orderItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          order: expect.objectContaining({ status: 'PAID' }),
        }),
      }),
    );
  });

  it('gender L→male, P→female, null→unknown; achieved = sum grandTotal bulan terpilih', async () => {
    prisma.order.findMany.mockResolvedValue([
      order('L', 10000000, '2026-09-20T02:00:00Z'),
      order('P', 11500000, '2026-09-21T02:00:00Z'),
      order(null, 5000, '2026-09-22T02:00:00Z'),
      order('L', 7000, '2026-09-22T03:00:00Z'),
      order(null, 3000, '2026-09-18T02:00:00Z'),
      // Di luar bulan terpilih (Agustus) — tidak boleh masuk gender/achieved.
      order('P', 999999, '2026-08-02T02:00:00Z'),
    ]);
    prisma.orderItem.findMany.mockResolvedValue([]);
    prisma.monthlyTarget.findUnique.mockResolvedValue({ targetAmount: 50000000n });

    const result = await service.getOverview();

    expect(result.period).toEqual({ month: 9, year: 2026 });
    expect(result.gender).toEqual({ male: 2, female: 1, unknown: 2 });
    expect(result.target).toEqual({
      month: 9,
      year: 2026,
      targetAmount: 50000000,
      achievedAmount: 21515000,
      percent: 43, // Math.round(43.03) — pembulatan ke atas/bawah benar
    });
  });
  it('summary: hanya order bulan terpilih; ATV = Math.round(revenue / orders)', async () => {
    prisma.order.findMany.mockResolvedValue([
      order('L', 10000000, '2026-09-20T02:00:00Z'),
      order('P', 11500000, '2026-09-21T02:00:00Z'),
      order(null, 5000, '2026-09-22T02:00:00Z'),
      order('L', 7000, '2026-09-22T03:00:00Z'),
      order(null, 3000, '2026-09-18T02:00:00Z'),
      order('P', 999999, '2026-08-02T02:00:00Z'), // luar bulan — tidak masuk.
    ]);
    prisma.orderItem.findMany.mockResolvedValue([]);
    prisma.monthlyTarget.findUnique.mockResolvedValue(null);

    const result = await service.getOverview();

    expect(result.summary).toEqual({
      totalRevenue: 21515000,
      totalOrders: 5,
      averageTicket: Math.round(21515000 / 5),
    });
  });

  it('summary: tanpa order bulan itu → totalRevenue/totalOrders/averageTicket 0', async () => {
    prisma.order.findMany.mockResolvedValue([
      order('L', 999999, '2026-08-02T02:00:00Z'), // di luar bulan terpilih.
    ]);
    prisma.orderItem.findMany.mockResolvedValue([]);
    prisma.monthlyTarget.findUnique.mockResolvedValue(null);

    const result = await service.getOverview();

    expect(result.summary).toEqual({ totalRevenue: 0, totalOrders: 0, averageTicket: 0 });
  });

  it('summary: averageTicket dibulatkan Math.round (integer rupiah, tanpa float keluar)', async () => {
    prisma.order.findMany.mockResolvedValue([
      order('L', 100001, '2026-09-20T02:00:00Z'),
      order('P', 100001, '2026-09-21T02:00:00Z'),
    ]);
    prisma.orderItem.findMany.mockResolvedValue([]);
    prisma.monthlyTarget.findUnique.mockResolvedValue(null);

    const result = await service.getOverview();

    // 200002 / 2 = 100001 — bulat pas.
    expect(result.summary).toEqual({ totalRevenue: 200002, totalOrders: 2, averageTicket: 100001 });
  });

  it('summary: averageTicket pembulatan ke atas (Math.round)', async () => {
    prisma.order.findMany.mockResolvedValue([
      order('L', 100003, '2026-09-20T02:00:00Z'),
      order('P', 1, '2026-09-21T02:00:00Z'),
    ]);
    prisma.orderItem.findMany.mockResolvedValue([]);
    prisma.monthlyTarget.findUnique.mockResolvedValue(null);

    const result = await service.getOverview();

    // 100004 / 2 = 50001.5 → Math.round → 50002.
    expect(result.summary.averageTicket).toBe(50002);
  });

  it('dailyRevenue: tepat 7 entri urut naik, zero-fill, default zona UTC', async () => {
    prisma.order.findMany.mockResolvedValue([
      order('L', 50000, '2026-09-23T05:00:00Z'),
      order('P', 20000, '2026-09-17T23:00:00Z'),
    ]);
    prisma.orderItem.findMany.mockResolvedValue([]);
    prisma.monthlyTarget.findUnique.mockResolvedValue(null);

    const result = await service.getOverview();

    expect(result.dailyRevenue).toEqual([
      { date: '2026-09-17', revenue: 20000 },
      { date: '2026-09-18', revenue: 0 },
      { date: '2026-09-19', revenue: 0 },
      { date: '2026-09-20', revenue: 0 },
      { date: '2026-09-21', revenue: 0 },
      { date: '2026-09-22', revenue: 0 },
      { date: '2026-09-23', revenue: 50000 },
    ]);
  });

  it('dailyRevenue bucket mengikuti tzOffset (konvensi Date.getTimezoneOffset)', async () => {
    // 2026-09-17T20:00Z = 2026-09-18 03:00 WIB → harus jatuh ke bucket 09-18.
    prisma.order.findMany.mockResolvedValue([
      order('L', 50000, '2026-09-23T05:00:00Z'), // 12:00 WIB
      order('P', 20000, '2026-09-17T20:00:00Z'),
    ]);
    prisma.orderItem.findMany.mockResolvedValue([]);
    prisma.monthlyTarget.findUnique.mockResolvedValue(null);

    const result = await service.getOverview({ tzOffset: '-420' });

    expect(result.dailyRevenue.map((d) => d.date)).toEqual([
      '2026-09-17',
      '2026-09-18',
      '2026-09-19',
      '2026-09-20',
      '2026-09-21',
      '2026-09-22',
      '2026-09-23',
    ]);
    expect(result.dailyRevenue.find((d) => d.date === '2026-09-17')?.revenue).toBe(0);
    expect(result.dailyRevenue.find((d) => d.date === '2026-09-18')?.revenue).toBe(20000);
    expect(result.dailyRevenue.find((d) => d.date === '2026-09-23')?.revenue).toBe(50000);
  });

  it('jendela 7 hari boleh memotong bulan sebelumnya (revenue masuk, gender/target tidak)', async () => {
    // Waktu sistem digeser ke awal September — jendela 7 hari menyentuh Agustus.
    jest.setSystemTime(new Date('2026-09-01T02:00:00Z'));
    prisma.order.findMany.mockResolvedValue([
      order('P', 70000, '2026-08-30T05:00:00Z'), // dalam jendela 7 hari, di luar September
      order('L', 25000, '2026-09-01T01:00:00Z'), // dalam jendela DAN bulan terpilih
    ]);
    prisma.orderItem.findMany.mockResolvedValue([]);
    prisma.monthlyTarget.findUnique.mockResolvedValue({ targetAmount: 1000000n });

    const result = await service.getOverview();

    expect(result.dailyRevenue.map((d) => d.date)).toEqual([
      '2026-08-26',
      '2026-08-27',
      '2026-08-28',
      '2026-08-29',
      '2026-08-30',
      '2026-08-31',
      '2026-09-01',
    ]);
    expect(result.dailyRevenue.find((d) => d.date === '2026-08-30')?.revenue).toBe(70000);
    expect(result.gender).toEqual({ male: 1, female: 0, unknown: 0 });
    expect(result.target?.achievedAmount).toBe(25000);
  });

  describe('bestSellers', () => {
    const item = (productId: number, quantity: number, subtotal: number, name: string) => ({
      productId,
      quantity,
      subtotal,
      product: { name },
    });

    it('group by produk, sum quantity & subtotal, urut qty desc, tie-break productId asc, maks 5', async () => {
      prisma.order.findMany.mockResolvedValue([]);
      prisma.orderItem.findMany.mockResolvedValue([
        item(3, 5, 75000, 'Kopi Susu Gula Aren'),
        item(3, 2, 30000, 'Kopi Susu Gula Aren'), // produk sama → terakumulasi
        item(9, 1, 9000, 'Croissant'),
        item(1, 10, 200000, 'Americano'),
        item(2, 10, 50000, 'Cappuccino'), // tie qty 10 dengan produk 1 → productId asc
        item(4, 3, 60000, 'Matcha Latte'),
        item(7, 2, 44000, 'Butter Croissant'),
      ]);
      prisma.monthlyTarget.findUnique.mockResolvedValue(null);

      const result = await service.getOverview();

      expect(result.bestSellers).toEqual([
        { productId: 1, name: 'Americano', quantity: 10, revenue: 200000 },
        { productId: 2, name: 'Cappuccino', quantity: 10, revenue: 50000 },
        { productId: 3, name: 'Kopi Susu Gula Aren', quantity: 7, revenue: 105000 },
        { productId: 4, name: 'Matcha Latte', quantity: 3, revenue: 60000 },
        { productId: 7, name: 'Butter Croissant', quantity: 2, revenue: 44000 },
      ]); // produk 9 (qty 1) terpotong — maks 5.
    });
  });

  describe('target', () => {
    beforeEach(() => {
      prisma.order.findMany.mockResolvedValue([]);
      prisma.orderItem.findMany.mockResolvedValue([]);
    });

    it('belum diset di monthly_targets → target null', async () => {
      prisma.monthlyTarget.findUnique.mockResolvedValue(null);

      const result = await service.getOverview();

      expect(result.target).toBeNull();
    });

    it('target 0 → percent null', async () => {
      prisma.monthlyTarget.findUnique.mockResolvedValue({ targetAmount: 0n });

      const result = await service.getOverview();

      expect(result.target).toEqual({
        month: 9,
        year: 2026,
        targetAmount: 0,
        achievedAmount: 0,
        percent: null,
      });
    });

    it('BigInt targetAmount dikonversi Number (BigInt mentah membuat JSON.stringify crash)', async () => {
      prisma.monthlyTarget.findUnique.mockResolvedValue({ targetAmount: 1234567890123n });

      const result = await service.getOverview();

      expect(typeof result.target!.targetAmount).toBe('number');
      expect(result.target!.targetAmount).toBe(1234567890123);
    });

    it('percent = Math.round(achieved * 100 / target)', async () => {
      prisma.order.findMany.mockResolvedValue([order('L', 1, '2026-09-20T02:00:00Z')]);
      prisma.monthlyTarget.findUnique.mockResolvedValue({ targetAmount: 3n });

      const result = await service.getOverview();

      expect(result.target!.percent).toBe(33); // Math.round(33.333) = 33
    });
  });

  describe('bulan/tahun default & validasi', () => {
    beforeEach(() => {
      prisma.order.findMany.mockResolvedValue([]);
      prisma.orderItem.findMany.mockResolvedValue([]);
      prisma.monthlyTarget.findUnique.mockResolvedValue(null);
    });

    it('month/year kosong → bulan berjalan (default)', async () => {
      const result = await service.getOverview();

      expect(result.period).toEqual({ month: 9, year: 2026 });
      expect(prisma.monthlyTarget.findUnique).toHaveBeenCalledWith({
        where: { month_year: { month: 9, year: 2026 } },
      });
    });

    it('month/year terisi → dipakai (query string dari controller)', async () => {
      const result = await service.getOverview({ month: '7', year: '2025' });

      expect(result.period).toEqual({ month: 7, year: 2025 });
      expect(prisma.monthlyTarget.findUnique).toHaveBeenCalledWith({
        where: { month_year: { month: 7, year: 2025 } },
      });
    });

    it('default bulan berjalan mengikuti tzOffset', async () => {
      // 2026-09-30T18:00Z = 2026-10-01 01:00 WIB → bulan berjalan versi WIB = Oktober.
      jest.setSystemTime(new Date('2026-09-30T18:00:00Z'));

      const result = await service.getOverview({ tzOffset: '-420' });

      expect(result.period).toEqual({ month: 10, year: 2026 });
    });

    it.each([
      [{ month: '13' }, 'INVALID_MONTH'],
      [{ month: 'abc' }, 'INVALID_MONTH'],
      [{ month: '1.5' }, 'INVALID_MONTH'],
      [{ year: 'x' }, 'INVALID_YEAR'],
      [{ tzOffset: 'abc' }, 'INVALID_TZ_OFFSET'],
    ])('param invalid %j → 400 %s', async (query, code) => {
      await expect(service.getOverview(query)).rejects.toMatchObject({
        response: { code },
      });
      await expect(service.getOverview(query)).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
