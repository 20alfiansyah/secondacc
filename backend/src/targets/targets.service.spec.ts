import { Test } from '@nestjs/testing';
import { TargetsService } from './targets.service';
import { PrismaService } from '../prisma/prisma.service';

describe('TargetsService', () => {
  let service: TargetsService;
  let prisma: {
    monthlyTarget: {
      findUnique: jest.Mock;
      upsert: jest.Mock;
      findMany: jest.Mock;
    };
    order: {
      findMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      monthlyTarget: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        findMany: jest.fn(),
      },
      order: {
        findMany: jest.fn(),
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        TargetsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(TargetsService);
  });

  describe('find', () => {
    it('GET tanpa query → bulan berjalan; belum diset → targetAmount null (bukan 404)', async () => {
      // Tanggal beku agar "bulan berjalan" deterministik (Maret 2026).
      jest.useFakeTimers().setSystemTime(new Date('2026-03-15T10:00:00'));
      try {
        prisma.monthlyTarget.findUnique.mockResolvedValue(null);

        await expect(service.find({})).resolves.toEqual({
          month: 3,
          year: 2026,
          targetAmount: null,
        });

        expect(prisma.monthlyTarget.findUnique).toHaveBeenCalledWith({
          where: { month_year: { month: 3, year: 2026 } },
        });
      } finally {
        jest.useRealTimers();
      }
    });

    it('GET ?month=&year= kosong (string kosong) → dianggap tanpa query (bulan berjalan)', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-03-15T10:00:00'));
      try {
        prisma.monthlyTarget.findUnique.mockResolvedValue(null);

        await expect(service.find({ month: '', year: '' })).resolves.toEqual({
          month: 3,
          year: 2026,
          targetAmount: null,
        });
      } finally {
        jest.useRealTimers();
      }
    });

    it('GET dengan data → query string diparse & targetAmount BigInt dikonversi Number', async () => {
      prisma.monthlyTarget.findUnique.mockResolvedValue({
        id: 1,
        month: 9,
        year: 2026,
        targetAmount: BigInt('50000000'),
      });

      await expect(
        service.find({ month: '9', year: '2026' }),
      ).resolves.toEqual({ month: 9, year: 2026, targetAmount: 50000000 });

      expect(prisma.monthlyTarget.findUnique).toHaveBeenCalledWith({
        where: { month_year: { month: 9, year: 2026 } },
      });
    });

    it('GET month di luar 1-12 → 400 INVALID_MONTH (DB tidak dijamah)', async () => {
      await expect(service.find({ month: '13' })).rejects.toMatchObject({
        response: { code: 'INVALID_MONTH' },
      });
      expect(prisma.monthlyTarget.findUnique).not.toHaveBeenCalled();
    });

    it('GET year di luar 2000-2100 → 400 INVALID_YEAR', async () => {
      await expect(service.find({ year: '1999' })).rejects.toMatchObject({
        response: { code: 'INVALID_YEAR' },
      });
      expect(prisma.monthlyTarget.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('recent', () => {
    it('recent(3): 3 bulan lama→baru, target dari tabel, realisasi sum PAID per bulan, percent Math.round', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-09-24T10:00:00Z'));
      try {
        prisma.order.findMany.mockResolvedValue([
          { grandTotal: 500000, createdAt: new Date('2026-07-10T02:00:00Z') }, // Juli.
          { grandTotal: 907000, createdAt: new Date('2026-09-19T02:00:00Z') }, // September.
        ]);
        prisma.monthlyTarget.findMany.mockResolvedValue([
          { month: 9, year: 2026, targetAmount: 12000000n },
        ]);

        const result = await service.recent(3);

        expect(result.months).toHaveLength(3);
        expect(result.months.map((m) => m.month)).toEqual([7, 8, 9]);
        const sep = result.months[2];
        expect(sep).toEqual({ month: 9, year: 2026, targetAmount: 12000000, achievedAmount: 907000, percent: 8 });
        // Bulan tanpa target → targetAmount null, percent null.
        expect(result.months[0].targetAmount).toBeNull();
      } finally {
        jest.useRealTimers();
      }
    });

    it('recent: month tanpa transaksi → achievedAmount 0; count dipatok 1-12', async () => {
      prisma.order.findMany.mockResolvedValue([]);
      prisma.monthlyTarget.findMany.mockResolvedValue([]);

      const result = await service.recent(2);

      expect(result.months).toHaveLength(2);
      expect(result.months.every((m) => m.achievedAmount === 0 && m.targetAmount === null && m.percent === null)).toBe(true);
    });
  });

  describe('upsert', () => {
    it('PUT bulan baru → create via upsert, simpan BigInt, respons Number', async () => {
      prisma.monthlyTarget.upsert.mockResolvedValue({
        id: 1,
        month: 9,
        year: 2026,
        targetAmount: BigInt('50000000'),
      });

      await expect(
        service.upsert({ month: 9, year: 2026, targetAmount: 50000000 }),
      ).resolves.toEqual({ month: 9, year: 2026, targetAmount: 50000000 });

      // Konversi dua arah: masuk Number → disimpan BigInt → keluar Number.
      expect(prisma.monthlyTarget.upsert).toHaveBeenCalledWith({
        where: { month_year: { month: 9, year: 2026 } },
        create: { month: 9, year: 2026, targetAmount: BigInt('50000000') },
        update: { targetAmount: BigInt('50000000') },
      });
    });

    it('PUT bulan sama dua kali → upsert menuju unique [month, year] sama (tanpa duplikat)', async () => {
      prisma.monthlyTarget.upsert.mockResolvedValue({
        id: 1,
        month: 9,
        year: 2026,
        targetAmount: BigInt('60000000'),
      });

      await service.upsert({ month: 9, year: 2026, targetAmount: 50000000 });
      await service.upsert({ month: 9, year: 2026, targetAmount: 60000000 });

      // Upsert atomik pada unique [month, year] — tak mungkin menghasilkan duplikat.
      expect(prisma.monthlyTarget.upsert).toHaveBeenCalledTimes(2);
      expect(prisma.monthlyTarget.upsert).toHaveBeenLastCalledWith(
        expect.objectContaining({
          where: { month_year: { month: 9, year: 2026 } },
        }),
      );
    });

    it('PUT month invalid → 400 INVALID_MONTH (0, 13, pecahan) — upsert tidak dipanggil', async () => {
      await expect(
        service.upsert({ month: 0, year: 2026, targetAmount: 1000 }),
      ).rejects.toMatchObject({ response: { code: 'INVALID_MONTH' } });
      await expect(
        service.upsert({ month: 13, year: 2026, targetAmount: 1000 }),
      ).rejects.toMatchObject({ response: { code: 'INVALID_MONTH' } });
      await expect(
        service.upsert({ month: 1.5, year: 2026, targetAmount: 1000 }),
      ).rejects.toMatchObject({ response: { code: 'INVALID_MONTH' } });
      expect(prisma.monthlyTarget.upsert).not.toHaveBeenCalled();
    });

    it('PUT year invalid → 400 INVALID_YEAR (1999, 2101)', async () => {
      await expect(
        service.upsert({ month: 9, year: 1999, targetAmount: 1000 }),
      ).rejects.toMatchObject({ response: { code: 'INVALID_YEAR' } });
      await expect(
        service.upsert({ month: 9, year: 2101, targetAmount: 1000 }),
      ).rejects.toMatchObject({ response: { code: 'INVALID_YEAR' } });
      expect(prisma.monthlyTarget.upsert).not.toHaveBeenCalled();
    });

    it('PUT targetAmount invalid → 400 INVALID_TARGET_AMOUNT (negatif, >1e12, pecahan)', async () => {
      await expect(
        service.upsert({ month: 9, year: 2026, targetAmount: -1 }),
      ).rejects.toMatchObject({ response: { code: 'INVALID_TARGET_AMOUNT' } });
      await expect(
        service.upsert({ month: 9, year: 2026, targetAmount: 1_000_000_000_001 }),
      ).rejects.toMatchObject({ response: { code: 'INVALID_TARGET_AMOUNT' } });
      await expect(
        service.upsert({ month: 9, year: 2026, targetAmount: 10.5 }),
      ).rejects.toMatchObject({ response: { code: 'INVALID_TARGET_AMOUNT' } });
      expect(prisma.monthlyTarget.upsert).not.toHaveBeenCalled();
    });

    it('PUT boundary 0 dan 1e12 diterima; BigInt dua arah utk nilai besar', async () => {
      // Echo create → verifikasi roundtrip BigInt langsung dari nilai tersimpan.
      prisma.monthlyTarget.upsert.mockImplementation(
        ({ create }: { create: { month: number; year: number; targetAmount: bigint } }) =>
          Promise.resolve({ ...create, id: 1 }),
      );

      // Respons persis bentuk kontrak: { month, year, targetAmount } — tanpa id/timestamp.
      await expect(
        service.upsert({ month: 1, year: 2026, targetAmount: 0 }),
      ).resolves.toEqual({ month: 1, year: 2026, targetAmount: 0 });

      await expect(
        service.upsert({ month: 2, year: 2026, targetAmount: 1_000_000_000_000 }),
      ).resolves.toEqual({ month: 2, year: 2026, targetAmount: 1_000_000_000_000 });

      expect(prisma.monthlyTarget.upsert).toHaveBeenLastCalledWith(
        expect.objectContaining({
          create: { month: 2, year: 2026, targetAmount: BigInt('1000000000000') },
        }),
      );
    });
  });
});
