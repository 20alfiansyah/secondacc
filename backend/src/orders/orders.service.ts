import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, OrderType, PaymentCategory } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma as PrismaNS } from '@prisma/client';
import {
  calculateItemSubtotal,
  calculateGrandTotal,
  calculateCashChange,
} from './financial.calculator';
import { buildInvoice, dailyPrefix, extractSequence, toDateKey } from './invoice.generator';

export interface OpenBillItemInput {
  productId: number;
  quantity: number;
  notes?: string;
}

export interface OpenBillInput {
  orderType: OrderType;
  tableId?: number;
  customerName: string;
  items: OpenBillItemInput[];
}

export interface CheckoutInput {
  customerGender?: 'L' | 'P';
  paymentCategory: PaymentCategory;
  methodName: string;
  amountPaid: number;
}

type Tx = PrismaNS.TransactionClient;

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  /** Generate sequence harian & invoice number dalam transaksi. */
  private async generateInvoice(tx: Tx): Promise<{ orderNumber: string; invoiceNumber: string }> {
    const prefix = dailyPrefix();
    const last = await tx.order.findFirst({
      where: { invoiceNumber: { startsWith: prefix } },
      orderBy: { invoiceNumber: 'desc' },
      select: { invoiceNumber: true },
    });
    const nextSeq = last ? extractSequence(last.invoiceNumber) + 1 : 1;
    return buildInvoice(toDateKey(), nextSeq);
  }

  /**
   * POST /api/orders/open-bill — ACID: buat Order + OrderItems dalam satu
   * transaksi. Harga `unitPrice` di-snapshot dari DB (BUKAN dari client).
   */
  async openBill(input: OpenBillInput) {
    const customerName = input.customerName?.trim();
    if (!customerName) {
      throw new BadRequestException({
        code: 'CUSTOMER_NAME_REQUIRED',
        message: 'Nama pelanggan wajib diisi',
      });
    }
    if (!input.items || input.items.length === 0) {
      throw new BadRequestException({
        code: 'EMPTY_ITEMS',
        message: 'Pesanan minimal berisi 1 item',
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const { invoiceNumber, orderNumber } = await this.generateInvoice(tx);

      // Snapshot harga sekarang dari DB untuk semua productId yang dipesan
      const productIds = input.items.map((i) => i.productId);
      const products = await tx.product.findMany({ where: { id: { in: productIds } } });
      const priceById = new Map(products.map((p) => [p.id, p.price]));

      const orderItems = input.items.map((item) => {
        const price = priceById.get(item.productId);
        if (price === undefined) {
          throw new NotFoundException({
            code: 'PRODUCT_NOT_FOUND',
            message: `Produk id ${item.productId} tidak ditemukan`,
          });
        }
        const subtotal = calculateItemSubtotal(item.quantity, price);
        return {
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: price,
          subtotal,
          notes: item.notes ?? null,
        };
      });

      const grandTotal = calculateGrandTotal(
        orderItems.map((o) => ({ quantity: o.quantity, unitPrice: o.unitPrice })),
      );

      const order = await tx.order.create({
        data: {
          invoiceNumber,
          orderType: input.orderType,
          tableId: input.tableId ?? null,
          cashierId: 2, // TODO: dari konteks pengguna login (JwtAuthGuard) di task lanjutan
          customerName,
          status: OrderStatus.OPEN_BILL,
          subtotal: grandTotal,
          grandTotal,
          orderItems: { create: orderItems },
        },
        include: { table: true },
      });

      return {
        orderId: order.id,
        invoiceNumber: order.invoiceNumber,
        orderNumber,
        orderType: order.orderType,
        status: order.status,
        tableNumber: order.table?.tableNumber ?? null,
        customerName: order.customerName,
        subtotal: order.subtotal,
        grandTotal: order.grandTotal,
      };
    });
  }

  /** GET /api/orders/active — semua order OPEN_BILL untuk Active Orders Line.
   *  itemCount dihitung sebagai TOTAL qty (bukan jumlah baris orderItems). */
  async getActive() {
    const orders = await this.prisma.order.findMany({
      where: { status: OrderStatus.OPEN_BILL },
      include: {
        orderItems: { select: { quantity: true } },
        table: true,
        cashier: { select: { id: true, name: true } },
      },
      orderBy: { id: 'desc' },
    });
    return orders.map((order) => ({
      ...order,
      itemCount: (order.orderItems ?? []).reduce((sum, i) => sum + i.quantity, 0),
    }));
  }

  /**
   * POST /api/orders/:id/checkout — ACID: validasi status, hitung ulang
   * finansial server-side, simpan Payment, set PAID. Rollback jika gagal.
   */
  async checkout(id: number, input: CheckoutInput) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id },
        include: { orderItems: true },
      });
      if (!order) {
        throw new NotFoundException({
          code: 'ORDER_NOT_FOUND',
          message: `Order id ${id} tidak ditemukan`,
        });
      }
      if (order.status !== OrderStatus.OPEN_BILL) {
        throw new ConflictException({
          code: 'ORDER_NOT_OPEN_BILL',
          message: 'Order bukan OPEN_BILL, tidak bisa di-checkout',
        });
      }

      // Hitung ulang finansial server-side dari item yang tersimpan
      const grandTotal = calculateGrandTotal(
        order.orderItems.map((o) => ({ quantity: o.quantity, unitPrice: o.unitPrice })),
      );

      let changeDue = 0;
      if (input.paymentCategory === PaymentCategory.CASH) {
        changeDue = calculateCashChange(input.amountPaid, grandTotal); // thow jika kurang
      }

      const updated = await tx.order.update({
        where: { id },
        data: {
          status: OrderStatus.PAID,
          grandTotal,
          customerGender: input.customerGender ?? null,
          payment: {
            create: {
              category: input.paymentCategory,
              methodName: input.methodName,
              amountPaid: input.amountPaid,
              changeDue,
            },
          },
        },
        include: { cashier: { select: { name: true } }, table: true, payment: true },
      });

      return {
        invoiceNumber: updated.invoiceNumber,
        status: updated.status,
        orderType: updated.orderType,
        customerGender: updated.customerGender,
        customerName: updated.customerName,
        grandTotal: updated.grandTotal,
        amountPaid: input.amountPaid,
        changeDue,
        paidAt: updated.payment?.paidAt ?? new Date(),
        cashierName: updated.cashier?.name ?? null,
        tableNumber: updated.table?.tableNumber ?? null,
      };
    });
  }

  /** GET /api/orders/history — transaksi PAID dgn filter tanggal & search. */
  async history(query: { from?: string; to?: string; search?: string }) {
    const where: PrismaNS.OrderWhereInput = { status: OrderStatus.PAID };

    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) where.createdAt.gte = new Date(`${query.from}T00:00:00.000Z`);
      if (query.to) where.createdAt.lte = new Date(`${query.to}T23:59:59.999Z`);
    }
    if (query.search) {
      where.OR = [
        { invoiceNumber: { contains: query.search, mode: 'insensitive' } },
        { customerName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.order.findMany({
      where,
      include: {
        cashier: { select: { id: true, name: true } },
        payment: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
