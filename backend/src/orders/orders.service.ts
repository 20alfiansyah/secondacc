import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FinancialCalculator } from './financial.calculator';
import { CustomerGender, OrderStatus, PaymentCategory } from '@prisma/client';
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
  customerGender: CustomerGender;
  payment: PaymentInput;
}

interface TxPrisma {
  orderItem: { createMany: (args: any) => Promise<any> };
  cafeTable: { update: (args: any) => Promise<any> };
  order: {
    create: (args: any) => Promise<any>;
    update: (args: any) => Promise<any>;
  };
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

    const invoiceNumber = await this.generateInvoiceNumber();

    // Semua mutasi dalam SATU transaksi ACID
    return this.prisma.$transaction(async (tx) => {
      const order = await (tx as any).order.create({
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

      await (tx as any).orderItem.createMany({
        data: input.items.map((item) => ({
          orderId: order.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: priceMap.get(item.productId)!,
          subtotal: priceMap.get(item.productId)! * BigInt(item.quantity),
          notes: item.notes ?? null,
        })),
      });

      await (tx as any).cafeTable.update({
        where: { id: input.tableId },
        data: { isOccupied: true },
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
  }

  async checkout(orderId: number, input: CheckoutInput) {
    // Muat order + items dalam transaksi agar konsisten
    return this.prisma.$transaction(async (tx) => {
      const order = await (tx as any).order.findFirst({
        where: { id: orderId, status: OrderStatus.OPEN_BILL },
        include: { items: true },
      });
      if (!order) {
        throw new NotFoundException('Open bill order not found');
      }

      const grandTotal = order.grandTotal as bigint;

      if (input.payment.category === PaymentCategory.CASH) {
        FinancialCalculator.calculateChange(grandTotal, input.payment.amountPaid);
      }

      const updated = await (tx as any).order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.PAID,
          customerGender: input.customerGender,
        },
        include: { items: { include: { product: true } } },
      });

      const payment = await (tx as any).payment.create({
        data: {
          orderId: order.id,
          category: input.payment.category,
          methodName: input.payment.methodName,
          amountPaid: BigInt(input.payment.amountPaid),
          changeDue:
            input.payment.category === PaymentCategory.CASH
              ? BigInt(input.payment.amountPaid) - grandTotal
              : BigInt(0),
        },
      });

      // Kosongkan meja jika order terkait meja
      if (order.tableId != null) {
        await (tx as any).cafeTable.update({
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

  /** Generate nomor invoice format: INV-YYYYMMDD-NNNN */
  private async generateInvoiceNumber(): Promise<string> {
    const now = new Date();
    const yyyymmdd = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('');

    const prefix = `INV-${yyyymmdd}-`;
    const last = await this.prisma.order.findFirst({
      where: { invoiceNumber: { startsWith: prefix } },
      orderBy: { invoiceNumber: 'desc' },
      select: { invoiceNumber: true },
    });

    const lastSeq = last ? Number(last.invoiceNumber.slice(prefix.length)) : 0;
    const seq = String(lastSeq + 1).padStart(4, '0');

    return `${prefix}${seq}`;
  }
}
