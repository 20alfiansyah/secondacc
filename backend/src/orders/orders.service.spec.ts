import { Test } from '@nestjs/testing';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus, OrderType, PaymentCategory } from '@prisma/client';

/** Callback mock generik: argumen tak berbentuk (payload prisma), hasil bebas. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MockImpl = (payload?: any) => unknown;

// Helper: bangun objek mock ber-nested dengan jest.fn, implememtasi bisa dioverride.
function buildMockTree(paths: Record<string, MockImpl>): Record<string, unknown> {
  // Tree mock bersarang secara dinamis — satu-satunya cara tanpa menduplikasi
  // seluruh bentuk PrismaClient di spec (bentuk framework, bukan yang diuji).
  const root: Record<string, unknown> = {};
  for (const [path, impl] of Object.entries(paths)) {
    const parts = path.split('.');
    let cur = root;
    for (const p of parts.slice(0, -1)) {
      cur[p] ??= {};
      cur = cur[p] as Record<string, unknown>;
    }
    cur[parts[parts.length - 1]] = jest.fn(impl as (...args: never[]) => unknown);
  }
  return root;
}

describe('OrdersService (ACID & finansial server-side)', () => {
  let service: OrdersService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let prisma: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let tx: any;

  const productA = { id: 10, name: 'Kopi Susu Gula Aren', price: 25000, isAvailable: true };
  const productB = { id: 15, name: 'Lychee Splash', price: 30000, isAvailable: true };

  const openOrder = {
    id: 45,
    invoiceNumber: 'INV-20260907-0001',
    orderType: OrderType.DINE_IN,
    customerName: 'Rian',
    status: OrderStatus.OPEN_BILL,
    subtotal: 50000,
    grandTotal: 50000,
    cashier: { id: 2, name: 'Siti' },
    table: null,
    orderItems: [{ productId: 10, quantity: 2, unitPrice: 25000, subtotal: 50000 }],
  };

  const defaults: Record<string, MockImpl> = {
    'product.findMany': () => Promise.resolve([productA, productB]),
    'order.findFirst': () => Promise.resolve(null),
    'order.create': (d) => Promise.resolve({ id: 45, ...d.data }),
    'order.findUnique': () => Promise.resolve(null),
    'order.updateMany': () => Promise.resolve({ count: 1 }),
    'order.findMany': () => Promise.resolve([]),
    'order.update': (d) => Promise.resolve({ id: 45, ...d.data }),
    'payment.create': (d) => Promise.resolve({ id: 1, ...d.data }),
  };

  async function setup(overrides: Record<string, MockImpl> = {}) {
    const merged = { ...defaults, ...overrides };
    tx = buildMockTree(merged);
    // panggilan di luar transaksi (getActive/history) memakai this.prisma.order
    prisma = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      $transaction: jest.fn(async (cb: any) => cb(tx)),
      order: tx.order,
    };
    const mod = await Test.createTestingModule({
      providers: [OrdersService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = mod.get(OrdersService);
  }

  // ===== Invoice sequence =====
  describe('generateInvoice & sequence harian', () => {
    it('order pertama hari ini = Order #001 dan INV-YYYYMMDD-0001', async () => {
      await setup({ 'order.findFirst': () => Promise.resolve(null) });
      const r = await service.openBill({
        orderType: OrderType.DINE_IN,
        customerName: 'Rian',
        items: [{ productId: 10, quantity: 2 }],
      }, 1);
      expect(r.invoiceNumber).toMatch(/^INV-\d{8}-0001$/);
      expect(r.orderNumber).toBe('Order #001');
    });

    it('melanjutkan urutan dari invoice terakhir hari ini (0002)', async () => {
      await setup({
        'order.findFirst': () =>
          Promise.resolve({ invoiceNumber: 'INV-20260907-0001' }),
      });
      const r = await service.openBill({
        orderType: OrderType.TAKE_AWAY,
        customerName: 'Budi',
        items: [{ productId: 10, quantity: 1 }],
      }, 1);
      expect(r.invoiceNumber).toMatch(/INV-\d{8}-0002$/);
      expect(r.orderNumber).toBe('Order #002');
    });
  });

  // ===== Open Bill =====
  describe('openBill', () => {
    it('membuat Order OPEN_BILL + OrderItems dengan snapshot harga dari DB', async () => {
      await setup({
        'order.create': (d) => Promise.resolve({ id: 45, ...d.data }),
      });
      const r = await service.openBill({
        orderType: OrderType.DINE_IN,
        customerName: 'Rian',
        items: [{ productId: 10, quantity: 2, notes: 'Less ice' }],
      }, 1);
      expect(r.status).toBe(OrderStatus.OPEN_BILL);
      // harga server-side dari DB (25000), bukan dari client
      expect(r.subtotal).toBe(50000);
      expect(r.grandTotal).toBe(50000);

      const createCall = tx.order.create.mock.calls[0][0];
      expect(createCall.data.status).toBe(OrderStatus.OPEN_BILL);
      expect(createCall.data.orderItems.create).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ productId: 10, quantity: 2, unitPrice: 25000, subtotal: 50000 }),
        ]),
      );
    });

    it('menolak customerName kosong', async () => {
      await setup();
      await expect(
        service.openBill({
          orderType: OrderType.DINE_IN,
          customerName: '   ',
          items: [{ productId: 10, quantity: 1 }],
        }, 1),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('menolak items kosong', async () => {
      await setup();
      await expect(
        service.openBill({
          orderType: OrderType.DINE_IN,
          customerName: 'Rian',
          items: [],
        }, 1),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
    it('menyimpan customerGender saat open bill', async () => {
      await setup();
      await service.openBill({
        orderType: OrderType.DINE_IN,
        customerName: 'Rian',
        customerGender: 'L',
        items: [{ productId: 10, quantity: 1 }],
      }, 1);
      expect(tx.order.create.mock.calls[0][0].data.customerGender).toBe('L');
    });
  });


  // ===== Update items (full edit open bill) =====
  describe('updateItems', () => {
    it('replace items + hitung ulang total server-side dari harga DB', async () => {
      await setup({
        'order.findUnique': (() => {
          let calls = 0;
          return () => {
            calls += 1;
            // Panggilan ke-2 (setelah claim) harus membaca data ter-update
            if (calls >= 2) {
              return Promise.resolve({
                ...openOrder,
                subtotal: 85000,
                grandTotal: 85000,
                customerName: 'Rian',
              });
            }
            return Promise.resolve(openOrder);
          };
        })(),
        'order.updateMany': () => Promise.resolve({ count: 1 }),
        'orderItem.deleteMany': () => Promise.resolve({ count: 1 }),
        'orderItem.createMany': (d) => Promise.resolve({ count: d.data.length }),
      });
      const r = await service.updateItems(45, {
        customerName: 'Rian',
        items: [{ productId: 10, quantity: 1 }, { productId: 15, quantity: 2, notes: 'Extra shot' }],
      });
      // 1x25000 + 2x30000 = 85000 — snapshot harga DB, bukan angka client
      expect(r.subtotal).toBe(85000);
      expect(r.grandTotal).toBe(85000);
      expect(tx.orderItem.deleteMany).toHaveBeenCalledWith({ where: { orderId: 45 } });
      expect(tx.orderItem.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ productId: 15, quantity: 2, unitPrice: 30000, subtotal: 60000, orderId: 45 }),
        ]),
      });
      const updateCall = tx.order.updateMany.mock.calls[0][0];
      expect(updateCall.where).toEqual({ id: 45, status: OrderStatus.OPEN_BILL });
      expect(updateCall.data.grandTotal).toBe(85000);
      expect(updateCall.data.customerName).toBe('Rian');
    });

    it('menolak update order yang sudah PAID', async () => {
      await setup({
        'order.findUnique': () => Promise.resolve({ ...openOrder, status: OrderStatus.PAID }),
      });
      await expect(
        service.updateItems(45, { items: [{ productId: 10, quantity: 1 }] }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('menolak items kosong', async () => {
      await setup();
      await expect(service.updateItems(45, { items: [] })).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('menolak produk yang tidak dikenal', async () => {
      await setup({ 'order.findUnique': () => Promise.resolve(openOrder) });
      await expect(
        service.updateItems(45, { items: [{ productId: 999, quantity: 1 }] }),
      ).rejects.toThrow();
    });
  });

  // ===== Checkout =====
  describe('checkout', () => {
    it('checkout tunai: klaim atomik OPEN_BILL→PAID, payment + changeDue benar', async () => {
      await setup({
        'order.findUnique': () => Promise.resolve(openOrder),
        'order.update': (d) =>
          Promise.resolve({ ...openOrder, ...d.data, id: 45, status: OrderStatus.PAID }),
        'payment.create': (d) => Promise.resolve({ id: 1, ...d.data }),
      });
      const r = await service.checkout(45, {
        paymentCategory: PaymentCategory.CASH,
        methodName: 'Cash',
        amountPaid: 100000,
        customerGender: 'L',
      });
      expect(r.status).toBe(OrderStatus.PAID);
      expect(r.amountPaid).toBe(100000);
      expect(r.changeDue).toBe(50000);
      expect(r.grandTotal).toBe(50000);
      // Klaim atomik: filter status di WHERE, set PAID di data
      expect(tx.order.updateMany).toHaveBeenCalledWith({
        where: { id: 45, status: OrderStatus.OPEN_BILL },
        data: { status: OrderStatus.PAID },
      });
    });

    it('bayar kurang (amountPaid < grandTotal) => error, TIDAK ada update/payment (rollback)', async () => {
      await setup({
        'order.findUnique': () => Promise.resolve(openOrder),
      });
      await expect(
        service.checkout(45, {
          paymentCategory: PaymentCategory.CASH,
          methodName: 'Cash',
          amountPaid: 10000,
          customerGender: 'L',
        }),
      ).rejects.toThrow();
      expect(tx.order.update).not.toHaveBeenCalled();
      expect(tx.payment.create).not.toHaveBeenCalled();
    });

    it('menolak order yang bukan OPEN_BILL (PAID)', async () => {
      await setup({
        'order.findUnique': () => Promise.resolve({ ...openOrder, status: OrderStatus.PAID }),
      });
      await expect(
        service.checkout(45, {
          paymentCategory: PaymentCategory.CASH,
          methodName: 'Cash',
          amountPaid: 100000,
          customerGender: 'L',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('NotFound jika order tidak ada', async () => {
      await setup({ 'order.findUnique': () => Promise.resolve(null) });
      await expect(
        service.checkout(999, {
          paymentCategory: PaymentCategory.CASH,
          methodName: 'Cash',
          amountPaid: 100000,
          customerGender: 'L',
        }),
      ).rejects.toThrow();
    });

    it('checkout tanpa gender mempertahankan gender order', async () => {
      await setup({
        'order.findUnique': () => Promise.resolve({ ...openOrder, customerGender: 'P' }),
        'order.update': (d) => Promise.resolve({ ...openOrder, ...d.data, id: 45 }),
      });
      await service.checkout(45, {
        paymentCategory: PaymentCategory.THIRD_PARTY,
        methodName: 'QRIS',
        amountPaid: 50000,
      });
      expect(tx.order.update.mock.calls[0][0].data.customerGender).toBe('P');
    });

    it('klaim gagal (kasir lain menang balapan) => ConflictException, tidak ada payment', async () => {
      await setup({
        'order.findUnique': () => Promise.resolve(openOrder),
        // Kasir lain lebih dulu meng-claim: filter WHERE tidak match
        'order.updateMany': () => Promise.resolve({ count: 0 }),
      });
      await expect(
        service.checkout(45, {
          paymentCategory: PaymentCategory.CASH,
          methodName: 'Cash',
          amountPaid: 100000,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(tx.payment.create).not.toHaveBeenCalled();
    });

    it('non-tunai amountPaid < grandTotal => ditolak (tanpa payment)', async () => {
      await setup({
        'order.findUnique': () => Promise.resolve(openOrder),
      });
      await expect(
        service.checkout(45, {
          paymentCategory: PaymentCategory.THIRD_PARTY,
          methodName: 'QRIS',
          amountPaid: 25000, // grandTotal 50000
        }),
      ).rejects.toThrow();
      expect(tx.order.updateMany).not.toHaveBeenCalled();
      expect(tx.payment.create).not.toHaveBeenCalled();
    });

    it('non-tunai amountPaid float => ditolak sebelum mutasi apa pun', async () => {
      await setup({
        'order.findUnique': () => Promise.resolve(openOrder),
      });
      await expect(
        service.checkout(45, {
          paymentCategory: PaymentCategory.THIRD_PARTY,
          methodName: 'EDC',
          amountPaid: 50000.5,
        }),
      ).rejects.toThrow();
      expect(tx.order.updateMany).not.toHaveBeenCalled();
    });
  });

  // ===== Active Orders =====
  describe('getActive', () => {
    it('mengambil semua order OPEN_BILL', async () => {
      await setup({
        'order.findMany': () =>
          Promise.resolve([
            { id: 1, status: OrderStatus.OPEN_BILL },
            { id: 2, status: OrderStatus.OPEN_BILL },
          ]),
      });
      const r = await service.getActive();
      expect(r).toHaveLength(2);
      expect(tx.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: OrderStatus.OPEN_BILL }),
        }),
      );
    });

    it('itemCount = total qty (bukan jumlah baris orderItems)', async () => {
      await setup({
        'order.findMany': () =>
          Promise.resolve([
            {
              id: 1,
              status: OrderStatus.OPEN_BILL,
              orderItems: [
                { quantity: 2 },
                { quantity: 3 },
                { quantity: 1 },
              ],
            },
          ]),
      });
      const r = await service.getActive();
      expect(r[0].itemCount).toBe(6); // 2 + 3 + 1, bukan jumlah baris (3)
      // pastikan include memilih quantity (untuk menghitung total qty)
      const call = tx.order.findMany.mock.calls[0][0];
      expect(call.include.orderItems.select).toEqual({ quantity: true });
    });
  });

  // ===== History =====
  describe('history', () => {
    it('memfilter PAID + rentang tanggal + search invoice/nama', async () => {
      await setup();
      await service.history({ from: '2026-09-01', to: '2026-09-07', search: 'Rian' });

      const call = tx.order.findMany.mock.calls[0][0];
      const where = call.where;
      expect(where.status).toBe(OrderStatus.PAID);
      expect(where.createdAt).toBeDefined();
      expect(where.OR).toBeDefined();
    });
  });
});
