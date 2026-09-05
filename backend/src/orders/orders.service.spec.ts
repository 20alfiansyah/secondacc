import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { CustomerGender, OrderStatus, PaymentCategory } from '@prisma/client';

function prismaMock() {
  // Klien transaksi (dioper $transaction ke callback) — semua mutasi memakainya.
  // id diisi setelah dibuat (order.order = mock.orderOrder) agar referensi terisi
  // tanpa perlu urutan pendefinisian yang rapuh.
  // Klien transaksi (dioper $transaction ke callback) — semua mutasi memakainya.
  const orderMock = {
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
  };

  const mock = {
    user: { findUnique: jest.fn() },
    cafeTable: { findUnique: jest.fn(), update: jest.fn() },
    product: { findMany: jest.fn() },
    // order (klien luar) dipakai generateInvoiceNumber -> prisma.order.findFirst;
    // tx.order memakai object yang sama supaya stub satu sumber.
    order: orderMock,
    orderItem: { createMany: jest.fn() },
    payment: { create: jest.fn() },
    $transaction: jest.fn((fn: (tx: any) => Promise<any>) => fn(txClient)),
  } as any;

  const txClient = {
    order: orderMock,
    orderItem: mock.orderItem,
    payment: mock.payment,
    cafeTable: mock.cafeTable,
  };

  mock.txClient = txClient;
  return mock;
}

function cashierRow() {
  return { id: 1, username: 'kasir1', name: 'Siti Kasir', role: 'CASHIER' };
}

function productRow(overrides: Partial<any> = {}) {
  return {
    id: overrides.id ?? 10,
    name: 'Nasi Goreng Spesial',
    price: overrides.price ?? BigInt(28000),
    isAvailable: true,
    ...overrides,
  };
}

function tableRow(overrides: Partial<any> = {}) {
  return {
    id: 1,
    tableNumber: 'Meja 01',
    isOccupied: false,
    ...overrides,
  };
}

describe('OrdersService (open-bill + checkout dalam transaksi ACID)', () => {
  let service: OrdersService;
  let prismaMock_;
  let tx: any;

  beforeAll(async () => {
    prismaMock_ = prismaMock();
    tx = prismaMock_.txClient;

    const module: TestingModule = await Test.createTestingModule({
      providers: [OrdersService, { provide: PrismaService, useValue: prismaMock_ }],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  beforeEach(() => jest.clearAllMocks());

  describe('1. openBill', () => {
    it('membuat order OPEN_BILL + items + menandai meja terisi dalam satu transaksi', async () => {
      // Tanggal invoice memakai tanggal lokal hari ini (format INV-YYYYMMDD-XXXX)
      const now = new Date()
      const yyyymmdd = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, '0'),
        String(now.getDate()).padStart(2, '0'),
      ].join('')
      const invoiceNumber = `INV-${yyyymmdd}-0045`

      prismaMock_.user.findUnique.mockResolvedValue(cashierRow());
      prismaMock_.cafeTable.findUnique.mockResolvedValue(tableRow());
      prismaMock_.product.findMany.mockResolvedValue([productRow()]);
      // generateInvoiceNumber: invoice terakhir (seq 0044) -> yang baru 0045
      prismaMock_.order.findFirst.mockResolvedValue({
        invoiceNumber: `INV-${yyyymmdd}-0044`,
      });
      tx.order.create.mockResolvedValue({
        id: 45,
        invoiceNumber,
        tableId: 1,
        status: OrderStatus.OPEN_BILL,
        subtotal: BigInt(56000),
        grandTotal: BigInt(56000),
      });
      tx.orderItem.createMany.mockResolvedValue({ count: 1 });
      tx.cafeTable.update.mockResolvedValue(tableRow({ isOccupied: true }));

      const result = await service.openBill(
        { tableId: 1, items: [{ productId: 10, quantity: 2, notes: 'Pedas sedang' }] },
        { sub: 1, username: 'kasir1', role: 'CASHIER' },
      );

      expect(result).toMatchObject({
        id: 45,
        invoiceNumber,
        tableId: 1,
        status: OrderStatus.OPEN_BILL,
        subtotal: 56000,
        grandTotal: 56000,
      });

      // Transaksi harus menulis order, items, dan menandai meja sekaligus
      expect(prismaMock_.$transaction).toHaveBeenCalled();
      expect(tx.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            invoiceNumber,
            cashierId: 1,
            tableId: 1,
            status: OrderStatus.OPEN_BILL,
            subtotal: BigInt(56000),
            grandTotal: BigInt(56000),
          }),
        }),
      );
      expect(tx.orderItem.createMany).toHaveBeenCalled();
      expect(tx.cafeTable.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { isOccupied: true },
      });
    });

    it('menolak jika meja sudah terisi (isOccupied = true)', async () => {
      prismaMock_.user.findUnique.mockResolvedValue(cashierRow());
      prismaMock_.cafeTable.findUnique.mockResolvedValue(tableRow({ isOccupied: true }));
      prismaMock_.product.findMany.mockResolvedValue([productRow()]);

      await expect(
        service.openBill(
          { tableId: 1, items: [{ productId: 10, quantity: 2 }] },
          { sub: 1, username: 'kasir1', role: 'CASHIER' },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('menolak jika produk tidak ditemukan', async () => {
      prismaMock_.user.findUnique.mockResolvedValue(cashierRow());
      prismaMock_.cafeTable.findUnique.mockResolvedValue(tableRow());
      prismaMock_.product.findMany.mockResolvedValue([]);

      await expect(
        service.openBill(
          { tableId: 1, items: [{ productId: 999, quantity: 1 }] },
          { sub: 1, username: 'kasir1', role: 'CASHIER' },
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('2. checkout', () => {
    it('mengubah order -> PAID, merekam gender & payment, mengosongkan meja, semua dalam 1 transaksi', async () => {
      tx.order.findFirst.mockResolvedValue({
        id: 45,
        invoiceNumber: 'INV-20260905-0045',
        tableId: 1,
        cashierId: 1,
        status: OrderStatus.OPEN_BILL,
        subtotal: BigInt(56000),
        grandTotal: BigInt(56000),
        items: [{ quantity: 2, unitPrice: BigInt(28000), subtotal: BigInt(56000) }],
      });
      tx.cafeTable.update.mockResolvedValue(tableRow({ isOccupied: false }));
      tx.order.update.mockResolvedValue({
        id: 45,
        invoiceNumber: 'INV-20260905-0045',
        status: OrderStatus.PAID,
        customerGender: CustomerGender.L,
        subtotal: BigInt(56000),
        grandTotal: BigInt(56000),
        items: [
          {
            quantity: 2,
            unitPrice: BigInt(28000),
            subtotal: BigInt(56000),
            notes: 'Pedas sedang',
            product: { id: 10, name: 'Nasi Goreng Spesial' },
          },
        ],
      });
      tx.payment.create.mockResolvedValue({
        id: 1,
        orderId: 45,
        category: PaymentCategory.CASH,
        methodName: 'Tunai',
        amountPaid: BigInt(100000),
        changeDue: BigInt(44000),
        paidAt: new Date('2026-09-05T20:15:00Z'),
      });

      const result = await service.checkout(
        45,
        {
          customerGender: CustomerGender.L,
          payment: { category: PaymentCategory.CASH, methodName: 'Tunai', amountPaid: 100000 },
        },
      );

      expect(result.order).toMatchObject({
        id: 45,
        status: OrderStatus.PAID,
        customerGender: 'L',
        grandTotal: 56000,
      });
      expect(result.order.payment).toMatchObject({
        category: PaymentCategory.CASH,
        methodName: 'Tunai',
        amountPaid: 100000,
        changeDue: 44000,
      });
      // Item order (untuk struk) disertakan dengan nama produk & qty
      expect(result.order.items).toEqual([
        {
          productName: 'Nasi Goreng Spesial',
          quantity: 2,
          unitPrice: 28000,
          notes: 'Pedas sedang',
        },
      ]);
      // ACS: meja dikosongkan dalam transaksi yang sama
      expect(tx.cafeTable.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { isOccupied: false },
      });
    });

    it('menolak order yang bukan OPEN_BILL (status PAID) — filter status di query', async () => {
      // Query checkout memakai where { status: OPEN_BILL }, sehingga order PAID
      // tidak mungkin muncul -> NotFoundException (bukan operasi ilegal).
      tx.order.findFirst.mockResolvedValue(null);

      await expect(
        service.checkout(45, {
          customerGender: CustomerGender.L,
          payment: { category: PaymentCategory.CASH, methodName: 'Tunai', amountPaid: 100000 },
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('menolak jika order tidak ditemukan', async () => {
      tx.order.findFirst.mockResolvedValue(null);

      await expect(
        service.checkout(45, {
          customerGender: CustomerGender.L,
          payment: { category: PaymentCategory.CASH, methodName: 'Tunai', amountPaid: 100000 },
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
