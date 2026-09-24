import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertTargetDto } from './dto/targets.dto';

/** Rentang validasi kontrak §4.2 (docs/10) — dipakai GET query & PUT body. */
const RANGES = {
  month: {
    min: 1,
    max: 12,
    code: 'INVALID_MONTH',
    message: 'month must be an integer between 1 and 12',
  },
  year: {
    min: 2000,
    max: 2100,
    code: 'INVALID_YEAR',
    message: 'year must be an integer between 2000 and 2100',
  },
  targetAmount: {
    min: 0,
    max: 1_000_000_000_000,
    code: 'INVALID_TARGET_AMOUNT',
    message: 'targetAmount must be an integer between 0 and 1000000000000',
  },
} as const;

type Range = (typeof RANGES)[keyof typeof RANGES];

@Injectable()
export class TargetsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * GET /api/targets?month=&year= — target omset bulanan (khusus ADMIN).
   * Query kosong → bulan berjalan. Belum diset → targetAmount null (bukan 404).
   */
  async find(query: { month?: string | number; year?: string | number }) {
    const now = new Date();
    const month = this.parseQuery(query.month, now.getMonth() + 1, RANGES.month);
    const year = this.parseQuery(query.year, now.getFullYear(), RANGES.year);

    const target = await this.prisma.monthlyTarget.findUnique({
      where: { month_year: { month, year } },
    });
    // BigInt tidak boleh bocor ke respons (JSON.stringify melempar TypeError).
    return { month, year, targetAmount: target ? Number(target.targetAmount) : null };
  }

  /**
   * GET /api/targets/recent?count=3 — target + realisasi N bulan terakhir (termasuk bulan
   * berjalan) untuk widget Monthly Target di dashboard. Khusus ADMIN.
   * Realisasi = sum grandTotal order PAID bulan tsb; tanpa target → targetAmount null.
   */
  async recent(months = 3) {
    const total = Math.min(Math.max(Number.isInteger(months) ? months : 3, 1), 12);
    const now = new Date();

    // Daftar N bulan terakhir (termasuk bulan berjalan), lama → baru.
    const list = Array.from({ length: total }, (_, i) => {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
    }).reverse();

    // Realisasi: sum grandTotal order PAID per bulan (batas bulan UTC — konsisten overview).
    const orders = await this.prisma.order.findMany({
      where: {
        status: 'PAID',
        createdAt: { gte: new Date(Date.UTC(list[0].year, list[0].month - 1, 1)) },
      },
      select: { grandTotal: true, createdAt: true },
    });
    const achievedBy: Record<string, number> = {};
    for (const o of orders) {
      const key = `${o.createdAt.getUTCFullYear()}-${o.createdAt.getUTCMonth() + 1}`;
      achievedBy[key] = (achievedBy[key] ?? 0) + o.grandTotal;
    }

    const targetRows = await this.prisma.monthlyTarget.findMany({
      where: { OR: list.map(({ month, year }) => ({ month, year })) },
    });
    const targetBy = new Map(targetRows.map((t) => [`${t.year}-${t.month}`, Number(t.targetAmount)]));

    return {
      months: list.map(({ month, year }) => {
        const targetAmount = targetBy.get(`${year}-${month}`) ?? null;
        const achievedAmount = achievedBy[`${year}-${month}`] ?? 0;
        const percent = targetAmount && targetAmount > 0 ? Math.round((achievedAmount * 100) / targetAmount) : null;
        return { month, year, targetAmount, achievedAmount, percent };
      }),
    };
  }

  /**
   * PUT /api/targets — simpan (upsert) target omset bulanan (khusus ADMIN).
   * Setting, bukan data transaksional: upsert atomik pada unique [month, year]
   * (update boleh; tidak ada DELETE).
   */
  async upsert(dto: UpsertTargetDto) {
    this.assertRange(dto.month, RANGES.month);
    this.assertRange(dto.year, RANGES.year);
    this.assertRange(dto.targetAmount, RANGES.targetAmount);

    const target = await this.prisma.monthlyTarget.upsert({
      where: { month_year: { month: dto.month, year: dto.year } },
      create: { month: dto.month, year: dto.year, targetAmount: BigInt(dto.targetAmount) },
      update: { targetAmount: BigInt(dto.targetAmount) },
    });
    return { month: target.month, year: target.year, targetAmount: Number(target.targetAmount) };
  }

  /** Tolak non-integer / di luar rentang → 400 dengan code kontrak. */
  private assertRange(value: number, range: Range): void {
    if (!Number.isInteger(value) || value < range.min || value > range.max) {
      throw new BadRequestException({ code: range.code, message: range.message });
    }
  }

  /** Query string dari URL → int tervalidasi; kosong/absen → fallback (bulan/tahun berjalan). */
  private parseQuery(value: string | number | undefined, fallback: number, range: Range): number {
    if (value === undefined || value === '') return fallback;
    const parsed = Number(value);
    this.assertRange(parsed, range);
    return parsed;
  }
}
