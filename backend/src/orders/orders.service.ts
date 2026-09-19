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
  assertValidAmount,
  InsufficientPaymentError,
  InvalidMoneyInputError,
} from './financial.calculator';
import { buildInvoice, dailyPrefix, extractSequence, toDateKey } from './invoice.generator';

/** Format tanggal yang diterima filter history (YYYY-MM-DD). */
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export interface OpenBillItemInput {
  productId: number;
  quantity: number;
  notes?: string;
}

export interface OpenBillInput {
  orderType: OrderType;
  tableId?: number;
  customerName: string;
  customerGender?: 'L' | 'P';
  items: OpenBillItemInput[];
}

/** Body untuk PUT /orders/:id/items — full replace items order OPEN_BILL. */
export interface UpdateOpenBillInput {
  customerName?: string;
  customerGender?: 'L' | 'P';
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
  async openBill(input: OpenBillInput, cashierId: number) {
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

    // Unique constraint pada invoiceNumber bisa bentrok saat 2 kasir open
    // bill bersamaan (sequence read-then-write). Retry: transaksi baru
    // membaca ulang sequence terbaru, sehingga percobaan ke-2 pasti unik.
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        return await this.prisma.$transaction(async (tx) => {
          const { invoiceNumber, orderNumber } = await this.generateInvoice(tx);
          const { orderItems, grandTotal } = await this.resolveOrderItems(tx, input.items);

          const order = await tx.order.create({
            data: {
              invoiceNumber,
              orderType: input.orderType,
              tableId: input.tableId ?? null,
              cashierId,
              customerName,
              customerGender: input.customerGender ?? null,
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
      } catch (err) {
        const isUniqueRace =
          err instanceof PrismaNS.PrismaClientKnownRequestError && err.code === 'P2002';
        if (!isUniqueRace || attempt === 3) throw err;
      }
    }
    throw new Error('unreachable');
  }

  /**
   * Snapshot harga SEMUA item dari DB (BUKAN dari client) + hitung grandTotal
   * server-side. Dipakai openBill (create) dan updateItems (full replace).
   */
  private async resolveOrderItems(tx: Tx, items: OpenBillItemInput[]) {
    const productIds = items.map((i) => i.productId);
    const products = await tx.product.findMany({ where: { id: { in: productIds } } });
    const priceById = new Map(products.map((p) => [p.id, p.price]));

    const orderItems = items.map((item) => {
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
    return { orderItems, grandTotal };
  }

  /**
   * PUT /api/orders/:id/items — full replace items order OPEN_BILL (edit
   * tiket kasir). ACID: hapus + buat ulang OrderItems, snapshot harga ulang
   * dari DB, hitung ulang total server-side. Menolak order bukan OPEN_BILL.
   */
  async updateItems(id: number, input: UpdateOpenBillInput) {
    if (!input.items || input.items.length === 0) {
      throw new BadRequestException({
        code: 'EMPTY_ITEMS',
        message: 'Pesanan minimal berisi 1 item',
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id } });
      if (!order) {
        throw new NotFoundException({
          code: 'ORDER_NOT_FOUND',
          message: `Order id ${id} tidak ditemukan`,
        });
      }
      if (order.status !== OrderStatus.OPEN_BILL) {
        throw new ConflictException({
          code: 'ORDER_NOT_OPEN_BILL',
          message: 'Order bukan OPEN_BILL, item tidak bisa diubah',
        });
      }

      const customerName = input.customerName?.trim() || order.customerName;
      const { orderItems, grandTotal } = await this.resolveOrderItems(tx, input.items);

      await tx.orderItem.deleteMany({ where: { orderId: id } });
      await tx.orderItem.createMany({
        data: orderItems.map((o) => ({ ...o, orderId: id })),
      });

      // Klaim atomik: order yang baru saja di-checkout oleh kasir lain tidak
      // boleh tertimpa. updateMany dengan filter status di WHERE = guard
      // race (findUnique di atas hanya untuk 404/409 yang enak dibaca).
      const claim = await tx.order.updateMany({
        where: { id, status: OrderStatus.OPEN_BILL },
        data: {
          subtotal: grandTotal,
          grandTotal,
          customerName,
          ...(input.customerGender ? { customerGender: input.customerGender } : {}),
        },
      });
      if (claim.count === 0) {
        throw new ConflictException({
          code: 'ORDER_NOT_OPEN_BILL',
          message: 'Order sudah tidak OPEN_BILL, item tidak bisa diubah',
        });
      }

      const updated = await tx.order.findUnique({ where: { id } });
      if (!updated) {
        throw new NotFoundException({
          code: 'ORDER_NOT_FOUND',
          message: `Order id ${id} tidak ditemukan`,
        });
      }

      return {
        orderId: updated.id,
        invoiceNumber: updated.invoiceNumber,
        orderType: updated.orderType,
        status: updated.status,
        customerName: updated.customerName,
        subtotal: updated.subtotal,
        grandTotal: updated.grandTotal,
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

  /** GET /api/orders/:id — rincian lengkap order utk pratinjau struk & reprint
   *  (items + product name, payment, kasir, meja). Per kontrak 6_API_CONTRACTS. */
  async getById(id: number) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        table: true,
        cashier: { select: { id: true, name: true } },
        payment: true,
        orderItems: {
          include: { product: { select: { id: true, name: true } } },
        },
      },
    });
    if (!order) {
      throw new NotFoundException({
        code: 'ORDER_NOT_FOUND',
        message: `Order id ${id} tidak ditemukan`,
      });
    }
    const { table, cashier, payment, orderItems, ...rest } = order;
    return {
      ...rest,
      tableId: table?.id ?? null,
      tableNumber: table?.tableNumber ?? null,
      cashierName: cashier?.name ?? null,
      payment: payment ?? null,
      items: orderItems.map((i) => ({
        productId: i.productId,
        productName: i.product?.name ?? 'Item',
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        subtotal: i.subtotal,
        notes: i.notes ?? null,
      })),
    };
  }

  /**
   * POST /api/orders/:id/checkout — ACID: validasi status, hitung ulang
   * finansial server-side, simpan Payment, set PAID. Rollback jika gagal.
   */
  async checkout(id: number, input: CheckoutInput) {
    try {
      return await this.checkoutInTx(id, input);
    } catch (err) {
      throw this.mapCheckoutError(err);
    }
  }

  /** Terjemahkan error kalkulasi finansial ke HTTP 400 yang konsisten. */
  private mapCheckoutError(err: unknown): unknown {
    if (err instanceof InsufficientPaymentError) {
      return new BadRequestException({
        code: 'INSUFFICIENT_PAYMENT',
        message: err.message,
      });
    }
    if (err instanceof InvalidMoneyInputError) {
      return new BadRequestException({
        code: 'INVALID_MONEY_INPUT',
        message: err.message,
      });
    }
    return err;
  }

  private async checkoutInTx(id: number, input: CheckoutInput) {
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
        changeDue = calculateCashChange(input.amountPaid, grandTotal); // throw jika kurang
      } else {
        // Non-tunai tidak punya kembalian, tapi tetap wajib menutup bill:
        // tolak amountPaid tidak valid atau kurang dari grandTotal.
        assertValidAmount(input.amountPaid, 'amountPaid', { positive: true });
        if (input.amountPaid < grandTotal) {
          throw new InsufficientPaymentError(grandTotal, input.amountPaid);
        }
      }

      // Klaim atomik status OPEN_BILL -> PAID. Kasir kedua yang kehilangan
      // balapan mendapat 409, bukan double-payment (update tanpa guard bisa
      // membuat 2 Payment untuk order yang sama).
      const claim = await tx.order.updateMany({
        where: { id, status: OrderStatus.OPEN_BILL },
        data: { status: OrderStatus.PAID },
      });
      if (claim.count === 0) {
        throw new ConflictException({
          code: 'ORDER_NOT_OPEN_BILL',
          message: 'Order sudah dibayar oleh sesi lain',
        });
      }

      const updated = await tx.order.update({
        where: { id },
        data: {
          grandTotal,
          customerGender: input.customerGender ?? order.customerGender ?? null,
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
    if ((query.from && !DATE_RE.test(query.from)) || (query.to && !DATE_RE.test(query.to))) {
      throw new BadRequestException({
        code: 'INVALID_DATE_FORMAT',
        message: 'Format tanggal harus YYYY-MM-DD',
      });
    }
    if (query.from && query.to && query.from > query.to) {
      throw new BadRequestException({
        code: 'INVALID_DATE_RANGE',
        message: 'Tanggal awal tidak boleh setelah tanggal akhir',
      });
    }

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

  /**
   * PATCH /api/orders/:id/cancel — void order OPEN_BILL (ADMIN saja via
   * RolesGuard). Klaim atomik OPEN_BILL -> CANCELLED mencegah cancel vs
   * checkout balapan; meja yang masih di-claim ikut dikosongkan.
   */
  async cancel(id: number) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id } });
      if (!order) {
        throw new NotFoundException({
          code: 'ORDER_NOT_FOUND',
          message: `Order id ${id} tidak ditemukan`,
        });
      }

      // Klaim atomik OPEN_BILL -> CANCELLED: kasir lain yang checkout
      // bersamaan kalah race dan mendapat 409.
      const claim = await tx.order.updateMany({
        where: { id, status: OrderStatus.OPEN_BILL },
        data: { status: OrderStatus.CANCELLED },
      });
      if (claim.count === 0) {
        throw new ConflictException({
          code: 'ORDER_NOT_OPEN_BILL',
          message: 'Order bukan OPEN_BILL, tidak bisa dibatalkan',
        });
      }

      // Kosongkan meja bila order melekat pada meja (relasi SetNull hanya
      // aktif saat order dihapus; order masih ada -> lepas okupansi manual).
      if (order.tableId !== null) {
        await tx.table.update({
          where: { id: order.tableId },
          data: { isOccupied: false },
        });
      }

      return { id: order.id, invoiceNumber: order.invoiceNumber, status: OrderStatus.CANCELLED };
    });
  }
}
