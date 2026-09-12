import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { CustomerGender, OrderStatus, PaymentCategory, Prisma } from '@prisma/client';

interface OrderModelMock {
  create: jest.Mock;
  findFirst: jest.Mock;
  update: jest.Mock;
  findUnique: jest.Mock;
  findMany: jest.Mock;
}

interface PrismaMock {
  user: { findUnique: jest.Mock };
  cafeTable: { findUnique: jest.Mock; update: jest.Mock; updateMany: jest.Mock };
  product: { findMany: jest.Mock };
  // order (klien luar) dipakai generateInvoiceNumber; tx.order memakai object
  // yang sama supaya stub satu sumber.
  order: OrderModelMock;
  orderItem: { createMany: jest.Mock };
  payment: { create: jest.Mock };
  $transaction: jest.Mock;
  txClient: {
    order: OrderModelMock;
    orderItem: { createMany: jest.Mock };
    payment: { create: jest.Mock };
    cafeTable: PrismaMock['cafeTable'];
  };
}

function prismaMock(): PrismaMock {
  const orderMock: OrderModelMock = {
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
  };
  const cafeTableMock: PrismaMock['cafeTable'] = {
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  };
  const orderItemMock = { createMany: jest.fn() };
  const paymentMock = { create: jest.fn() };

  const mock: PrismaMock = {
    user: { findUnique: jest.fn() },
    cafeTable: cafeTableMock,
    product: { findMany: jest.fn() },
    order: orderMock,
    orderItem: orderItemMock,
    payment: paymentMock,
    $transaction: jest.fn(),
    txClient: {
      order: orderMock,
      orderItem: orderItemMock,
      payment: paymentMock,
      cafeTable: cafeTableMock,
    },
  };

  // Default: oper txClient ke callback transaksi.
  mock.$transaction.mockImplementation(
    (fn: (tx: PrismaMock['txClient']) => Promise<unknown>) => fn(mock.txClient),
  );
  return mock;
}

function cashierRow() {
  return { id: 1, username: 'kasir1', name: 'Siti Kasir', role: 'CASHIER' };
}

function productRow(overrides: { id?: number; price?: bigint } = {}) {
  return {
    id: overrides.id ?? 10,
    name: 'Nasi Goreng Spesial',
    price: overrides.price ?? BigInt(28000),
    isAvailable: true,
    ...overrides,
  };
}

function tableRow(overrides: { isOccupied?: boolean } = {}) {
  return {
    id: 1,
    tableNumber: 'Meja 01',
    isOccupied: false,
    ...overrides,
  };
}

describe('OrdersService (open-bill + checkout dalam transaksi ACID)', () => {
  let service: OrdersService;
  let prismaMock_: PrismaMock;
  let tx: PrismaMock['txClient'];

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
    it('membuat order OPEN_BILL + items + menandai meja terisi dalam satu transaksi (dengan customerName)', async () => {
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
        customerName: 'Budi',
        subtotal: BigInt(56000),
        grandTotal: BigInt(56000),
      });
      tx.orderItem.createMany.mockResolvedValue({ count: 1 });
      tx.cafeTable.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.openBill(
        {
          customerName: 'Budi',
          tableId: 1,
          items: [{ productId: 10, quantity: 2, notes: 'Pedas sedang' }],
        },
        { sub: 1, username: 'kasir1', role: 'CASHIER' },
      );

      expect(result).toMatchObject({
        id: 45,
        invoiceNumber,
        tableId: 1,
        status: OrderStatus.OPEN_BILL,
        customerName: 'Budi',
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
            customerName: 'Budi',
            status: OrderStatus.OPEN_BILL,
            subtotal: BigInt(56000),
            grandTotal: BigInt(56000),
          }),
        }),
      );
      expect(tx.orderItem.createMany).toHaveBeenCalled();
      expect(tx.cafeTable.updateMany).toHaveBeenCalledWith({
        where: { id: 1, isOccupied: false },
        data: { isOccupied: true },
      });
    });

    it('menyimpan customerName = null bila tidak dikirim (opsional)', async () => {
      prismaMock_.user.findUnique.mockResolvedValue(cashierRow());
      prismaMock_.cafeTable.findUnique.mockResolvedValue(tableRow());
      prismaMock_.product.findMany.mockResolvedValue([productRow()]);
      prismaMock_.order.findFirst.mockResolvedValue({ invoiceNumber: 'INV-20260905-0000' });
      tx.cafeTable.updateMany.mockResolvedValue({ count: 1 });
      tx.order.create.mockResolvedValue({
        id: 46,
        invoiceNumber: 'INV-20260905-0001',
        tableId: 1,
        status: OrderStatus.OPEN_BILL,
        customerName: null,
        subtotal: BigInt(56000),
        grandTotal: BigInt(56000),
      });

      const result = await service.openBill(
        { tableId: 1, items: [{ productId: 10, quantity: 2 }] },
        { sub: 1, username: 'kasir1', role: 'CASHIER' },
      );

      expect(result.customerName).toBeNull();
      expect(tx.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            customerName: null,
          }),
        }),
      );
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

    it('menolak bila meja diklaim request konkuren (updateMany count = 0)', async () => {
      // Outer check lolos (isOccupied masih false saat dibaca), tapi di dalam
      // transaksi meja sudah diklaim request lain -> otoritatif check menolak.
      prismaMock_.user.findUnique.mockResolvedValue(cashierRow());
      prismaMock_.cafeTable.findUnique.mockResolvedValue(tableRow());
      prismaMock_.product.findMany.mockResolvedValue([productRow()]);
      prismaMock_.order.findFirst.mockResolvedValue({ invoiceNumber: 'INV-20260905-0000' });
      tx.cafeTable.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.openBill(
          { tableId: 1, items: [{ productId: 10, quantity: 2 }] },
          { sub: 1, username: 'kasir1', role: 'CASHIER' },
        ),
      ).rejects.toThrow(BadRequestException);
      expect(tx.order.create).not.toHaveBeenCalled();
    });

    it('regenerate invoice & retry bila terjadi P2002 (openBill konkuren)', async () => {
      prismaMock_.user.findUnique.mockResolvedValue(cashierRow());
      prismaMock_.cafeTable.findUnique.mockResolvedValue(tableRow());
      prismaMock_.product.findMany.mockResolvedValue([productRow()]);
      prismaMock_.order.findFirst.mockResolvedValue({ invoiceNumber: 'INV-20260905-0044' });
      tx.cafeTable.updateMany.mockResolvedValue({ count: 1 });
      tx.order.create.mockResolvedValue({
        id: 45,
        invoiceNumber: 'INV-20260905-0045',
        tableId: 1,
        status: OrderStatus.OPEN_BILL,
        customerName: null,
        subtotal: BigInt(56000),
        grandTotal: BigInt(56000),
      });
      tx.orderItem.createMany.mockResolvedValue({ count: 1 });
      // Attempt pertama: duplikat invoice (P2002) -> retry; attempt kedua sukses.
      prismaMock_.$transaction
        .mockImplementationOnce(() =>
          Promise.reject(
            new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
              code: 'P2002',
              clientVersion: 'test',
            }),
          ),
        )
        .mockImplementationOnce((fn) => fn(tx));

      const result = await service.openBill(
        { tableId: 1, items: [{ productId: 10, quantity: 2 }] },
        { sub: 1, username: 'kasir1', role: 'CASHIER' },
      );

      expect(result.invoiceNumber).toBe('INV-20260905-0045');
      expect(prismaMock_.$transaction).toHaveBeenCalledTimes(2);
      expect(tx.order.create).toHaveBeenCalledTimes(1);
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
        customerName: 'Budi',
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
          customerName: 'Budi',
          customerGender: CustomerGender.L,
          payment: { category: PaymentCategory.CASH, methodName: 'Tunai', amountPaid: 100000 },
        },
      );

      expect(result.order).toMatchObject({
        id: 45,
        status: OrderStatus.PAID,
        customerName: 'Budi',
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
      // customerName dipersist saat checkout
      expect(tx.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ customerName: 'Budi' }),
        }),
      );
    });

    it('menolak pembayaran tunai kurang dari grandTotal (400, bukan 500)', async () => {
      tx.order.findFirst.mockResolvedValue({
        id: 45,
        invoiceNumber: 'INV-20260905-0045',
        tableId: 1,
        status: OrderStatus.OPEN_BILL,
        subtotal: BigInt(56000),
        grandTotal: BigInt(56000),
        items: [{ quantity: 2, unitPrice: BigInt(28000), subtotal: BigInt(56000) }],
      });

      await expect(
        service.checkout(45, {
          customerGender: CustomerGender.L,
          payment: { category: PaymentCategory.CASH, methodName: 'Tunai', amountPaid: 50000 },
        }),
      ).rejects.toThrow(BadRequestException);
      // Tidak ada payment yang tercatat untuk nominal kurang
      expect(tx.payment.create).not.toHaveBeenCalled();
    });

    it('menolak pembayaran non-tunai yang nominalnya tidak sama dengan grandTotal', async () => {
      tx.order.findFirst.mockResolvedValue({
        id: 45,
        invoiceNumber: 'INV-20260905-0045',
        tableId: 1,
        status: OrderStatus.OPEN_BILL,
        subtotal: BigInt(56000),
        grandTotal: BigInt(56000),
        items: [{ quantity: 2, unitPrice: BigInt(28000), subtotal: BigInt(56000) }],
      });

      await expect(
        service.checkout(45, {
          customerGender: CustomerGender.L,
          payment: { category: PaymentCategory.EDC, methodName: 'EDC BCA', amountPaid: 56001 },
        }),
      ).rejects.toThrow(BadRequestException);
      expect(tx.payment.create).not.toHaveBeenCalled();
    });

    it('menerima pembayaran non-tunai exact dan mencatat changeDue 0', async () => {
      tx.order.findFirst.mockResolvedValue({
        id: 45,
        invoiceNumber: 'INV-20260905-0045',
        tableId: 1,
        status: OrderStatus.OPEN_BILL,
        subtotal: BigInt(56000),
        grandTotal: BigInt(56000),
        items: [{ quantity: 2, unitPrice: BigInt(28000), subtotal: BigInt(56000) }],
      });
      tx.order.update.mockResolvedValue({
        id: 45,
        invoiceNumber: 'INV-20260905-0045',
        status: OrderStatus.PAID,
        customerName: 'Budi',
        customerGender: CustomerGender.L,
        subtotal: BigInt(56000),
        grandTotal: BigInt(56000),
        items: [
          {
            quantity: 2,
            unitPrice: BigInt(28000),
            subtotal: BigInt(56000),
            notes: null,
            product: { id: 10, name: 'Nasi Goreng Spesial' },
          },
        ],
      });
      tx.payment.create.mockResolvedValue({
        id: 1,
        orderId: 45,
        category: PaymentCategory.EDC,
        methodName: 'EDC BCA',
        amountPaid: BigInt(56000),
        changeDue: BigInt(0),
        paidAt: new Date('2026-09-05T20:15:00Z'),
      });

      const result = await service.checkout(45, {
        customerGender: CustomerGender.L,
        payment: { category: PaymentCategory.EDC, methodName: 'EDC BCA', amountPaid: 56000 },
      });

      expect(result.order.payment).toMatchObject({
        category: PaymentCategory.EDC,
        amountPaid: 56000,
        changeDue: 0,
      });
      expect(tx.payment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          amountPaid: BigInt(56000),
          changeDue: BigInt(0),
        }),
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

  describe('3. listOrders (riwayat / RECENT ORDERS)', () => {
    it('memfilter query ke status yang diminta dan memetakan BigInt ke Number', async () => {
      prismaMock_.order.findMany.mockResolvedValue([
        {
          id: 45,
          invoiceNumber: 'INV-20260905-0045',
          status: OrderStatus.PAID,
          tableId: 1,
          customerName: 'Budi',
          customerGender: CustomerGender.L,
          subtotal: BigInt(56000),
          grandTotal: BigInt(56000),
          createdAt: new Date('2026-09-05T20:15:00Z'),
          items: [{ quantity: 2 }],
          payment: { methodName: 'Tunai' },
          table: { tableNumber: 'Meja 01' },
        },
      ]);

      const result = await service.listOrders(OrderStatus.PAID);

      expect(result).toEqual([
        {
          id: 45,
          invoiceNumber: 'INV-20260905-0045',
          status: OrderStatus.PAID,
          tableId: 1,
          tableNumber: 'Meja 01',
          customerName: 'Budi',
          customerGender: 'L',
          paymentMethod: 'Tunai',
          subtotal: 56000,
          grandTotal: 56000,
          itemCount: 2,
          createdAt: new Date('2026-09-05T20:15:00Z'),
        },
      ]);

      // status difilter di level database
      expect(prismaMock_.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: OrderStatus.PAID } }),
      );
    });

    it('tanpa status, mengembalikan semua order dan tidak menambahkan where', async () => {
      prismaMock_.order.findMany.mockResolvedValue([]);

      await service.listOrders();

      expect(prismaMock_.order.findMany).toHaveBeenCalledWith(
        expect.not.objectContaining({ where: expect.anything() }),
      );
    });
  });

  describe('4. getOrderDetail', () => {
    it('mengembalikan detail lengkap dengan items & payment untuk re-print struk', async () => {
      prismaMock_.order.findUnique.mockResolvedValue({
        id: 45,
        invoiceNumber: 'INV-20260905-0045',
        status: OrderStatus.PAID,
        customerName: 'Budi',
        customerGender: CustomerGender.L,
        tableId: 1,
        subtotal: BigInt(56000),
        grandTotal: BigInt(56000),
        createdAt: new Date('2026-09-05T20:15:00Z'),
        table: { tableNumber: 'Meja 01' },
        items: [
          {
            quantity: 2,
            unitPrice: BigInt(28000),
            subtotal: BigInt(56000),
            notes: 'Pedas sedang',
            product: { name: 'Nasi Goreng Spesial' },
          },
        ],
        payment: {
          category: PaymentCategory.CASH,
          methodName: 'Tunai',
          amountPaid: BigInt(100000),
          changeDue: BigInt(44000),
          paidAt: new Date('2026-09-05T20:16:00Z'),
        },
      });

      const result = await service.getOrderDetail(45);

      expect(result).toMatchObject({
        id: 45,
        invoiceNumber: 'INV-20260905-0045',
        status: OrderStatus.PAID,
        customerName: 'Budi',
        customerGender: 'L',
        tableNumber: 'Meja 01',
        grandTotal: 56000,
      });
      expect(result.items).toEqual([
        {
          productName: 'Nasi Goreng Spesial',
          quantity: 2,
          unitPrice: 28000,
          subtotal: 56000,
          notes: 'Pedas sedang',
        },
      ]);
      expect(result.payment).toMatchObject({
        methodName: 'Tunai',
        amountPaid: 100000,
        changeDue: 44000,
      });
    });

    it('melempar NotFoundException bila order tidak ada', async () => {
      prismaMock_.order.findUnique.mockResolvedValue(null);

      await expect(service.getOrderDetail(999)).rejects.toThrow(NotFoundException);
    });
  });
  describe('5. cancel (batalkan open bill + kosongkan meja)', () => {
    it('membatalkan order OPEN_BILL: status -> CANCELLED dan meja dikosongkan dalam satu transaksi', async () => {
      prismaMock_.order.findUnique.mockResolvedValue({
        id: 45,
        status: OrderStatus.OPEN_BILL,
        tableId: 1,
      });
      prismaMock_.order.update.mockResolvedValue({
        id: 45,
        status: OrderStatus.CANCELLED,
      });

      const result = await service.cancel(45);

      expect(result).toEqual({ id: 45, status: OrderStatus.CANCELLED });
      // $transaction dipakai agar update order + meja atomik
      expect(prismaMock_.$transaction).toHaveBeenCalledTimes(1);
      expect(prismaMock_.order.update).toHaveBeenCalledWith({
        where: { id: 45 },
        data: { status: OrderStatus.CANCELLED },
      });
      expect(prismaMock_.cafeTable.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { isOccupied: false },
      });
    });

    it('tanpa meja (tableId null) tetap membatalkan tanpa menyentuh cafeTable', async () => {
      prismaMock_.order.findUnique.mockResolvedValue({
        id: 46,
        status: OrderStatus.OPEN_BILL,
        tableId: null,
      });
      prismaMock_.order.update.mockResolvedValue({
        id: 46,
        status: OrderStatus.CANCELLED,
      });

      await service.cancel(46);

      expect(prismaMock_.cafeTable.update).not.toHaveBeenCalled();
    });

    it('menolak membatalkan order yang sudah PAID', async () => {
      prismaMock_.order.findUnique.mockResolvedValue({
        id: 45,
        status: OrderStatus.PAID,
        tableId: 1,
      });

      await expect(service.cancel(45)).rejects.toThrow(BadRequestException);
      expect(prismaMock_.order.update).not.toHaveBeenCalled();
    });

    it('melempar NotFoundException bila order tidak ada', async () => {
      prismaMock_.order.findUnique.mockResolvedValue(null);

      await expect(service.cancel(999)).rejects.toThrow(NotFoundException);
    });
  });
});
