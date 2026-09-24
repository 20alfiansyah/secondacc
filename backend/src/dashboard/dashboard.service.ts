import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const DAY_MS = 86_400_000;

/** Query mentah dari controller — query string selalu string atau undefined. */
export interface OverviewQuery {
  month?: string;
  year?: string;
  tzOffset?: string;
}

/** Parse query integer opsional: kosong = undefined, bukan integer = 400. */
function parseOptionalInt(
  raw: string | undefined,
  code: string,
  message: string,
): number | undefined {
  if (raw === undefined || raw === '') return undefined;
  const value = Number(raw);
  if (!Number.isInteger(value)) {
    throw new BadRequestException({ code, message });
  }
  return value;
}


@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * GET /api/dashboard/overview — agregasi analitik (khusus ADMIN).
   * Semua agregasi hanya dari order status PAID; batas bulan & bucket harian
   * dihitung di zona `tzOffset` (menit, konvensi Date.getTimezoneOffset —
   * browser WIB mengirim -420; default 0 = UTC). Uang tetap integer rupiah.
   */
  async getOverview(query: OverviewQuery = {}) {
    const tzOffset =
      parseOptionalInt(
        query.tzOffset,
        'INVALID_TZ_OFFSET',
        'tzOffset must be an integer (minutes, Date.getTimezoneOffset convention)',
      ) ?? 0;

    // "Sekarang" di zona tzOffset: local wall clock dinyatakan seolah UTC.
    const nowLocalMs = Date.now() - tzOffset * 60_000;
    const nowLocal = new Date(nowLocalMs);

    const month =
      parseOptionalInt(query.month, 'INVALID_MONTH', 'month must be an integer between 1 and 12') ??
      nowLocal.getUTCMonth() + 1;
    if (month < 1 || month > 12) {
      throw new BadRequestException({
        code: 'INVALID_MONTH',
        message: 'month must be an integer between 1 and 12',
      });
    }
    const year =
      parseOptionalInt(query.year, 'INVALID_YEAR', 'year must be an integer') ??
      nowLocal.getUTCFullYear();

    // Batas bulan terpilih + jendela 7 hari (hari terakhir = hari ini versi tzOffset).
    const monthStartUtc = Date.UTC(year, month - 1, 1) + tzOffset * 60_000;
    const monthEndUtc = Date.UTC(year, month, 1) + tzOffset * 60_000;
    const todayIdx = Math.floor(nowLocalMs / DAY_MS); // indeks hari lokal (epoch day)
    const windowStartUtc = (todayIdx - 6) * DAY_MS + tzOffset * 60_000;
    const windowEndUtc = (todayIdx + 1) * DAY_MS + tzOffset * 60_000;
    // Rentang fetch = union bulan & jendela 7 hari (bisa memotong bulan sebelumnya).
    const rangeStartUtc = Math.min(monthStartUtc, windowStartUtc);
    const rangeEndUtc = Math.max(monthEndUtc, windowEndUtc);

    const [orders, items, targetRow] = await Promise.all([
      this.prisma.order.findMany({
        where: {
          status: 'PAID',
          createdAt: { gte: new Date(rangeStartUtc), lt: new Date(rangeEndUtc) },
        },
        select: { customerGender: true, grandTotal: true, createdAt: true },
      }),
      this.prisma.orderItem.findMany({
        where: {
          order: { status: 'PAID', createdAt: { gte: new Date(monthStartUtc), lt: new Date(monthEndUtc) } },
        },
        select: {
          productId: true,
          quantity: true,
          subtotal: true,
          product: { select: { name: true } },
        },
      }),
      this.prisma.monthlyTarget.findUnique({ where: { month_year: { month, year } } }),
    ]);

    // Pie gender + achieved target: hanya order dalam bulan terpilih.
    const gender = { male: 0, female: 0, unknown: 0 };
    let achieved = 0;
    let monthOrders = 0;
    let monthRevenue = 0;

    // Bucket omset harian — kunci = indeks hari lokal (epoch day).
    const revenueByIdx = new Map<number, number>();
    for (let i = 0; i < 7; i++) revenueByIdx.set(todayIdx - 6 + i, 0);

    for (const o of orders) {
      const at = o.createdAt.getTime();
      if (at >= monthStartUtc && at < monthEndUtc) {
        const bucket: 'male' | 'female' | 'unknown' =
          o.customerGender === 'L' ? 'male' : o.customerGender === 'P' ? 'female' : 'unknown';
        gender[bucket]++;
        monthOrders++;
        monthRevenue += o.grandTotal;
        achieved += o.grandTotal;
      }
      const dayIdx = Math.floor((at - tzOffset * 60_000) / DAY_MS);
      const current = revenueByIdx.get(dayIdx);
      if (current !== undefined) revenueByIdx.set(dayIdx, current + o.grandTotal);
    }

    // Tepat 7 entri urut naik, zero-fill (hari tanpa transaksi tetap muncul).
    // dayIdx * DAY_MS = tengah malam UTC hari lokal tsb → ISO slice = YYYY-MM-DD.
    const dailyRevenue: Array<{ date: string; revenue: number }> = [];
    for (let i = 0; i < 7; i++) {
      const dayIdx = todayIdx - 6 + i;
      dailyRevenue.push({
        date: new Date(dayIdx * DAY_MS).toISOString().slice(0, 10),
        revenue: revenueByIdx.get(dayIdx) ?? 0,
      });
    }

    // Best seller: group by productId, sum quantity & subtotal, urut qty desc,
    // tie-break productId asc, maks 5, nama dari relasi product.
    const byProduct = new Map<number, { name: string; quantity: number; revenue: number }>();
    for (const it of items) {
      const acc = byProduct.get(it.productId);
      if (acc) {
        acc.quantity += it.quantity;
        acc.revenue += it.subtotal;
      } else {
        byProduct.set(it.productId, {
          name: it.product.name,
          quantity: it.quantity,
          revenue: it.subtotal,
        });
      }
    }
    const bestSellers = [...byProduct.entries()]
      .map(([productId, agg]) => ({ productId, ...agg }))
      .sort((a, b) => b.quantity - a.quantity || a.productId - b.productId)
      .slice(0, 5);

    // BigInt WAJIB dikonversi Number di sini — BigInt mentah membuat JSON.stringify crash.
    let target: {
      month: number;
      year: number;
      targetAmount: number;
      achievedAmount: number;
      percent: number | null;
    } | null = null;
    if (targetRow) {
      const targetAmount = Number(targetRow.targetAmount);
      target = {
        month,
        year,
        targetAmount,
        achievedAmount: achieved,
        percent: targetAmount === 0 ? null : Math.round((achieved * 100) / targetAmount),
      };
    }

    // KPI ringkasan bulan: total omzet, jumlah order PAID, rata-rata per transaksi (integer rupiah).
    const summary = {
      totalRevenue: monthRevenue,
      totalOrders: monthOrders,
      averageTicket: monthOrders === 0 ? 0 : Math.round(monthRevenue / monthOrders),
    };

    return { period: { month, year }, gender, summary, dailyRevenue, bestSellers, target };
  }
}
