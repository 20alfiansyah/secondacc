import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, PaymentCategory } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma as PrismaNS } from '@prisma/client';
import {
  calculateItemSubtotal,
  calculateGrandTotal,
  assertPaymentCoversTotal,
  InsufficientPaymentError,
  InvalidMoneyInputError,
} from './financial.calculator';
import {
  CheckoutDto,
  OpenBillDto,
  OpenBillItemDto,
  UpdateOpenBillItemsDto,
} from './dto/orders.dto';
import { buildInvoice, dailyPrefix, extractSequence, toDateKey } from './invoice.generator';

/** Format tanggal yang diterima filter history (YYYY-MM-DD). */
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Gender filter history hanya menerima L atau P (kontrak 10_PHASE3 §4.3). */
const GENDER_RE = /^[LP]$/;

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
  async openBill(input: OpenBillDto, cashierId: number) {
    const customerName = input.customerName?.trim();
    if (!customerName) {
      throw new BadRequestException({
        code: 'CUSTOMER_NAME_REQUIRED',
        message: 'Customer name is required',
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
              cashierId,
              customerName,
              customerGender: input.customerGender ?? null,
              status: OrderStatus.OPEN_BILL,
              subtotal: grandTotal,
              grandTotal,
              orderItems: { create: orderItems },
            },
          });

          return {
            orderId: order.id,
            invoiceNumber: order.invoiceNumber,
            orderNumber,
            orderType: order.orderType,
            status: order.status,
            tableNumber: null,
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
  private async resolveOrderItems(tx: Tx, items: OpenBillItemDto[]) {
    const productIds = items.map((i) => i.productId);
    const products = await tx.product.findMany({ where: { id: { in: productIds } } });
    const productById = new Map(products.map((p) => [p.id, p]));

    const orderItems = items.map((item) => {
      const product = productById.get(item.productId);
      if (!product) {
        throw new NotFoundException({
          code: 'PRODUCT_NOT_FOUND',
          message: `Product id ${item.productId} not found`,
        });
      }
      if (!product.isAvailable) {
        // Align dengan frontend: produk sold out tidak boleh masuk keranjang.
        throw new BadRequestException({
          code: 'PRODUCT_SOLD_OUT',
          message: `${product.name} is sold out`,
        });
      }
      const price = product.price;
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
  async updateItems(id: number, input: UpdateOpenBillItemsDto) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id } });
      if (!order) {
        throw new NotFoundException({
          code: 'ORDER_NOT_FOUND',
          message: `Order id ${id} not found`,
        });
      }
      if (order.status !== OrderStatus.OPEN_BILL) {
        throw new ConflictException({
          code: 'ORDER_NOT_OPEN_BILL',
          message: 'Order is not OPEN_BILL — item cannot be modified',
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
          message: 'Order is no longer OPEN_BILL — item cannot be modified',
        });
      }

      const updated = await tx.order.findUnique({ where: { id } });
      if (!updated) {
        throw new NotFoundException({
          code: 'ORDER_NOT_FOUND',
          message: `Order id ${id} not found`,
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
   *  (items + product name, payment, kasir). Per kontrak 6_API_CONTRACTS. */
  async getById(id: number) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
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
        message: `Order id ${id} not found`,
      });
    }
    const { cashier, payment, orderItems, ...rest } = order;
    return {
      ...rest,
      // Kolom table_id sudah dihapus dari DB; field tetap dikirim null agar
      // kontrak OrderDetail frontend tidak berubah.
      tableId: null,
      tableNumber: null,
      cashierName: cashier.name,
      payment: payment ?? null,
      items: orderItems.map((i) => ({
        productId: i.productId,
        productName: i.product.name,
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
  async checkout(id: number, input: CheckoutDto) {
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

  private async checkoutInTx(id: number, input: CheckoutDto) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id },
        include: { orderItems: true },
      });
      if (!order) {
        throw new NotFoundException({
          code: 'ORDER_NOT_FOUND',
          message: `Order id ${id} not found`,
        });
      }
      if (order.status !== OrderStatus.OPEN_BILL) {
        throw new ConflictException({
          code: 'ORDER_NOT_OPEN_BILL',
          message: 'Order is not OPEN_BILL — cannot checkout',
        });
      }

      // Hitung ulang finansial server-side dari item yang tersimpan
      const grandTotal = calculateGrandTotal(
        order.orderItems.map((o) => ({ quantity: o.quantity, unitPrice: o.unitPrice })),
      );

      // CASH & non-CASH sama-sama wajib menutup bill; hanya CASH yang
      // menghasilkan kembalian.
      const overpaid = assertPaymentCoversTotal(grandTotal, input.amountPaid);
      const changeDue = input.paymentCategory === PaymentCategory.CASH ? overpaid : 0;

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
          message: 'Order was already paid by another session',
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
        include: { cashier: { select: { name: true } }, payment: true },
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
        paidAt: updated.payment!.paidAt,
        cashierName: updated.cashier.name,
        tableNumber: null,
      };
    });
  }

  /** GET /api/orders/history — transaksi PAID dgn filter tanggal, search, gender & product. */
  async history(query: {
    from?: string;
    to?: string;
    search?: string;
    searchBy?: 'invoice' | 'customer';
    gender?: string;
    product?: string;
  }) {
    if ((query.from && !DATE_RE.test(query.from)) || (query.to && !DATE_RE.test(query.to))) {
      throw new BadRequestException({
        code: 'INVALID_DATE_FORMAT',
        message: 'Date must be in YYYY-MM-DD format',
      });
    }
    if (query.from && query.to && query.from > query.to) {
      throw new BadRequestException({
        code: 'INVALID_DATE_RANGE',
        message: 'Start date cannot be after end date',
      });
    }

    if (query.gender && !GENDER_RE.test(query.gender)) {
      throw new BadRequestException({
        code: 'INVALID_GENDER',
        message: 'Gender must be L or P',
      });
    }

    const where: PrismaNS.OrderWhereInput = { status: OrderStatus.PAID };

    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) where.createdAt.gte = new Date(`${query.from}T00:00:00.000Z`);
      if (query.to) where.createdAt.lte = new Date(`${query.to}T23:59:59.999Z`);
    }
    if (query.search) {
      // searchBy menentukan field: invoice saja atau nama customer saja (kontrak §4.3).
      // Tanpa searchBy → perilaku lama (OR keduanya) untuk drawer kasir.
      const like = { contains: query.search, mode: 'insensitive' as const };
      if (query.searchBy === 'invoice') {
        where.OR = [{ invoiceNumber: like }];
      } else if (query.searchBy === 'customer') {
        where.OR = [{ customerName: like }];
      } else {
        where.OR = [{ invoiceNumber: like }, { customerName: like }];
      }
    }
    // Filter equality: customerGender null sengaja ter Exclude saat filter aktif.
    if (query.gender) {
      where.customerGender = query.gender as 'L' | 'P';
    }
    if (query.product) {
      where.orderItems = {
        some: { product: { name: { contains: query.product, mode: 'insensitive' } } },
      };
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
   * checkout balapan.
   */
  async cancel(id: number) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id } });
      if (!order) {
        throw new NotFoundException({
          code: 'ORDER_NOT_FOUND',
          message: `Order id ${id} not found`,
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
          message: 'Order is not OPEN_BILL — cannot be cancelled',
        });
      }


      return { id: order.id, invoiceNumber: order.invoiceNumber, status: OrderStatus.CANCELLED };
    });
  }
}
