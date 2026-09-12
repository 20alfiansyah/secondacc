import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, CustomerGender, OrderStatus, PaymentCategory } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FinancialCalculator } from './financial.calculator';
import { JwtPayload } from '../auth/jwt-auth.guard';

export interface OpenBillItemInput {
  productId: number;
  quantity: number;
  notes?: string;
}

export interface OpenBillInput {
  customerName?: string;
  tableId: number;
  items: OpenBillItemInput[];
}

export interface PaymentInput {
  category: PaymentCategory;
  methodName: string;
  amountPaid: number;
}

export interface CheckoutInput {
  customerName?: string;
  customerGender: CustomerGender;
  payment: PaymentInput;
}


@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async openBill(input: OpenBillInput, user: JwtPayload) {
    // Validasi kasir
    const cashier = await this.prisma.user.findUnique({
      where: { id: user.sub },
    });
    if (!cashier) {
      throw new NotFoundException('Cashier not found');
    }

    // Validasi meja & cek tidak terisi
    const table = await this.prisma.cafeTable.findUnique({
      where: { id: input.tableId },
    });
    if (!table) {
      throw new NotFoundException('Table not found');
    }
    // Fast-fail untuk UX; validasi otoritatif dilakukan atomik di dalam transaksi.
    if (table.isOccupied) {
      throw new BadRequestException('Table is already occupied');
    }

    // Muat produk & validasi keberadaan
    const productIds = [...new Set(input.items.map((i) => i.productId))];
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
    });
    if (products.length !== productIds.length) {
      throw new NotFoundException('One or more products not found');
    }
    const priceMap = new Map(products.map((p) => [p.id, p.price]));

    const { subtotal, grandTotal } = FinancialCalculator.calculateTotals(
      input.items.map((item) => ({
        unitPrice: priceMap.get(item.productId)!,
        quantity: item.quantity,
      })),
    );

    // Transaksi ACID + retry P2002: nomor invoice di-generate DI DALAM transaksi,
    // sehingga dua openBill konkuren yang sama-sama membaca seq yang sama tidak
    // menghasilkan invoice duplikat — attempt kedua gagal unique constraint,
    // di-retry dengan seq berikutnya (maks 3 percobaan).
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await this.prisma.$transaction(async (tx) => {
          const invoiceNumber = await this.generateInvoiceNumber(tx);

          // Klaim meja secara atomik (anti double open-bill): gagal bila
          // antara validasi awal dan transaksi ini meja sudah diisi request lain.
          const claimed = await tx.cafeTable.updateMany({
            where: { id: input.tableId, isOccupied: false },
            data: { isOccupied: true },
          });
          if (claimed.count === 0) {
            throw new BadRequestException('Table is already occupied');
          }

          const order = await tx.order.create({
            data: {
              invoiceNumber,
              tableId: input.tableId,
              cashierId: cashier.id,
              customerName: input.customerName ?? null,
              status: OrderStatus.OPEN_BILL,
              subtotal,
              grandTotal,
            },
          });

          await tx.orderItem.createMany({
            data: input.items.map((item) => ({
              orderId: order.id,
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: priceMap.get(item.productId)!,
              subtotal: priceMap.get(item.productId)! * BigInt(item.quantity),
              notes: item.notes ?? null,
            })),
          });

          return {
            id: order.id,
            invoiceNumber: order.invoiceNumber,
            tableId: order.tableId,
            status: order.status,
            customerName: order.customerName,
            subtotal: Number(order.subtotal),
            grandTotal: Number(order.grandTotal),
          };
        });
      } catch (error) {
        // Invoice duplikat karena transaksi konkuren: regenerate & coba ulang.
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002' &&
          attempt < 2
        ) {
          continue;
        }
        throw error;
      }
    }
    throw new ConflictException('Gagal menghasilkan nomor invoice, coba lagi');
  }

  async checkout(orderId: number, input: CheckoutInput) {
    // Unique constraint Payment.orderId menutup checkout ganda secara atomik;
    // P2002 dipetakan ke 409 agar kasir melihat "sudah dibayar", bukan 500.
    try {
      return await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const order = await tx.order.findFirst({
          where: { id: orderId, status: OrderStatus.OPEN_BILL },
          include: { items: true },
        });
        if (!order) {
          throw new NotFoundException('Open bill order not found');
        }

        const grandTotal = order.grandTotal;
        const amountPaid = BigInt(input.payment.amountPaid);

        if (input.payment.category === PaymentCategory.CASH) {
          // Error kalkulasi domain dipetakan ke 400 (bukan 500) supaya kasir
          // melihat nominal yang kurang.
          try {
            FinancialCalculator.calculateChange(grandTotal, amountPaid);
          } catch (error) {
            throw new BadRequestException(
              error instanceof Error ? error.message : 'Nominal pembayaran tidak valid',
            );
          }
        } else if (amountPaid !== grandTotal) {
          // Non-tunai (QRIS/EDC) selalu exact: order PAID dengan amountPaid
          // 0/salah korupsi omzet & target bulanan.
          throw new BadRequestException(
            'Nominal pembayaran non-tunai harus sama persis dengan total tagihan',
          );
        }

        const updated = await tx.order.update({
          where: { id: order.id },
          data: {
            status: OrderStatus.PAID,
            customerName: input.customerName ?? null,
            customerGender: input.customerGender,
          },
          include: { items: { include: { product: true } } },
        });

        const payment = await tx.payment.create({
          data: {
            orderId: order.id,
            category: input.payment.category,
            methodName: input.payment.methodName,
            amountPaid,
            changeDue:
              input.payment.category === PaymentCategory.CASH
                ? amountPaid - grandTotal
                : BigInt(0),
          },
        });

        // Kosongkan meja jika order terkait meja
        if (order.tableId != null) {
          await tx.cafeTable.update({
            where: { id: order.tableId },
            data: { isOccupied: false },
          });
        }

        const items = updated.items.map((item) => ({
          productName: item.product.name,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          notes: item.notes ?? null,
        }));

        return {
          order: {
            id: updated.id,
            invoiceNumber: updated.invoiceNumber,
            status: updated.status,
            customerName: updated.customerName,
            customerGender: updated.customerGender,
            grandTotal: Number(updated.grandTotal),
            items,
            payment: {
              category: payment.category,
              methodName: payment.methodName,
              amountPaid: Number(payment.amountPaid),
              changeDue: Number(payment.changeDue),
              paidAt: payment.paidAt,
            },
          },
        };
      });
    } catch (error) {
      // Checkout konkuren pada order yang sama: P2002 (payment.orderId unique).
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Order sudah dibayar');
      }
      throw error;
    }
  }

  /**
   * Daftar order difilter berdasarkan status (mis. OPEN_BILL / PAID).
   * Bila status diberikan, query difilter di level database, lalu dipetakan
   * ke payload ringkas untuk kartu RECENT ORDERS & riwayat transaksi.
   */
  async listOrders(status?: OrderStatus) {
    const orders = await this.prisma.order.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        items: true,
        payment: true,
        table: true,
      },
    });

    return orders.map((order) => ({
      id: order.id,
      invoiceNumber: order.invoiceNumber,
      status: order.status,
      tableId: order.tableId,
      tableNumber: order.table?.tableNumber ?? null,
      customerName: order.customerName ?? null,
      customerGender: order.customerGender ?? null,
      paymentMethod: order.payment?.methodName ?? null,
      subtotal: Number(order.subtotal),
      grandTotal: Number(order.grandTotal),
      itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
      createdAt: order.createdAt,
    }));
  }

  /**
   * Detail lengkap satu order dengan items (termasuk nama produk) & payment,
   * untuk panel ORDER DETAIL dan re-print struk.
   */
  async getOrderDetail(orderId: number) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { product: true } },
        payment: true,
        table: true,
      },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return {
      id: order.id,
      invoiceNumber: order.invoiceNumber,
      status: order.status,
      customerName: order.customerName ?? null,
      customerGender: order.customerGender ?? null,
      tableId: order.tableId,
      tableNumber: order.table?.tableNumber ?? null,
      subtotal: Number(order.subtotal),
      grandTotal: Number(order.grandTotal),
      createdAt: order.createdAt,
      items: order.items.map((item) => ({
        productName: item.product.name,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        subtotal: Number(item.subtotal),
        notes: item.notes ?? null,
      })),
      payment: order.payment
        ? {
            category: order.payment.category,
            methodName: order.payment.methodName,
            amountPaid: Number(order.payment.amountPaid),
            changeDue: Number(order.payment.changeDue),
            paidAt: order.payment.paidAt,
          }
        : null,
    };
  }

  /**
   * Batalkan open bill: order -> CANCELLED, meja dikosongkan.
   * Append-only: tidak ada delete, transaksi selesai tidak boleh dibatalkan.
   */
  async cancel(orderId: number) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (order.status !== OrderStatus.OPEN_BILL) {
      throw new BadRequestException('Hanya open bill yang dapat dibatalkan');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.CANCELLED },
      });
      if (order.tableId !== null) {
        await tx.cafeTable.update({
          where: { id: order.tableId },
          data: { isOccupied: false },
        });
      }
      return updated;
    });
  }

  /** Generate nomor invoice format: INV-YYYYMMDD-NNNN */
  private async generateInvoiceNumber(tx: Prisma.TransactionClient): Promise<string> {
    const now = new Date();
    const yyyymmdd = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('');

    const prefix = `INV-${yyyymmdd}-`;
    const last = await tx.order.findFirst({
      where: { invoiceNumber: { startsWith: prefix } },
      orderBy: { invoiceNumber: 'desc' },
      select: { invoiceNumber: true },
    });

    const lastSeq = last ? Number(last.invoiceNumber.slice(prefix.length)) : 0;
    const seq = String(lastSeq + 1).padStart(4, '0');

    return `${prefix}${seq}`;
  }
}
