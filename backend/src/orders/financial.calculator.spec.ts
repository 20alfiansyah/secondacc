import {
  calculateItemSubtotal,
  calculateGrandTotal,
  assertPaymentCoversTotal,
  InsufficientPaymentError,
} from './financial.calculator';

describe('FinancialCalculator (uang integer Rupiah, tanpa float)', () => {
  describe('calculateItemSubtotal — qty x price', () => {
    it('menghitung subtotal qty x price dengan precision integer', () => {
      expect(calculateItemSubtotal(2, 25000)).toBe(50000);
      expect(calculateItemSubtotal(3, 33333)).toBe(99999);
      expect(calculateItemSubtotal(7, 1)).toBe(7);
    });

    it('menghitung subtotal besar tanpa kehilangan presisi', () => {
      expect(calculateItemSubtotal(99, 99000)).toBe(9801000);
    });

    it('menolak quantity <= 0', () => {
      expect(() => calculateItemSubtotal(0, 25000)).toThrow();
      expect(() => calculateItemSubtotal(-1, 25000)).toThrow();
    });

    it('menolak price negatif', () => {
      expect(() => calculateItemSubtotal(2, -1000)).toThrow();
    });

    it('menolak price yang bukan integer (float) — proteksi floating point', () => {
      expect(() => calculateItemSubtotal(1, 0.1)).toThrow();
      expect(() => calculateItemSubtotal(1, 0.2)).toThrow();
    });
  });

  describe('calculateGrandTotal — penjumlahan subtotal item', () => {
    it('menjumlahkan subtotal semua item', () => {
      const items = [
        { quantity: 2, unitPrice: 25000 }, // 50000
        { quantity: 1, unitPrice: 18000 }, // 18000
        { quantity: 3, unitPrice: 30000 }, // 90000
      ];
      expect(calculateGrandTotal(items)).toBe(158000);
    });

    it('mengembalikan 0 untuk order kosong', () => {
      expect(calculateGrandTotal([])).toBe(0);
    });

    it('tidak menghasilkan artefak floating point saat menjumlah banyak item', () => {
      // 0.1 + 0.2 == 0.30000000000000004 — ini TIDAK BOLEH terjadi di kalkulasi uang.
      const items = [
        { quantity: 1, unitPrice: 100 },
        { quantity: 2, unitPrice: 200 },
      ];
      expect(calculateGrandTotal(items)).toBe(500); // integer bulat, bukan 499.999...
      expect(Number.isInteger(calculateGrandTotal(items))).toBe(true);
    });
  });

  describe('assertPaymentCoversTotal — pembayaran wajib menutup bill (CASH & non-CASH)', () => {
    it('pembayaran cukup: mengembalikan kelebihan bayar, pembayaran pas = 0', () => {
      expect(assertPaymentCoversTotal(35000, 50000)).toBe(15000);
      expect(assertPaymentCoversTotal(35000, 35000)).toBe(0);
    });

    it('pembayaran kurang: InsufficientPaymentError dengan pesan informatif', () => {
      try {
        assertPaymentCoversTotal(50000, 10000);
        throw new Error('seharusnya melempar error');
      } catch (err) {
        expect(err).toBeInstanceOf(InsufficientPaymentError);
        expect((err as Error).message).toBe(
          'Insufficient payment: amountPaid 10000 < grandTotal 50000',
        );
      }
    });

    it('menolak amountPaid non-integer (float) dan negatif', () => {
      expect(() => assertPaymentCoversTotal(50000, 50000.5)).toThrow();
      expect(() => assertPaymentCoversTotal(50000, -1)).toThrow();
    });
  });
});
