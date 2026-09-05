import { FinancialCalculator } from "./financial.calculator";

describe("FinancialCalculator (Superpowers Financial Integrity Unit Tests)", () => {
  describe("1. Perhitungan Subtotal & Grand Total Pesanan", () => {
    it("harus menghitung subtotal dengan benar untuk pesanan multi-item", () => {
      // 2 Nasi Goreng @ 35.000 + 1 Kopi Susu @ 25.000 + 3 Es Teh @ 20.000
      const items = [
        { unitPrice: 35000, quantity: 2 }, // 70.000
        { unitPrice: 25000, quantity: 1 }, // 25.000
        { unitPrice: 20000, quantity: 3 }, // 60.000
      ];

      const result = FinancialCalculator.calculateTotals(items);

      expect(result.subtotal).toBe(BigInt(155000));
      expect(result.grandTotal).toBe(BigInt(155000));
      expect(result.itemCount).toBe(6);
    });

    it("harus menghitung dengan benar untuk pesanan satu item tunggal", () => {
      const items = [{ unitPrice: 28000, quantity: 1 }];
      const result = FinancialCalculator.calculateTotals(items);

      expect(result.subtotal).toBe(BigInt(28000));
      expect(result.grandTotal).toBe(BigInt(28000));
      expect(result.itemCount).toBe(1);
    });

    it("harus melempar error jika daftar item pesanan kosong", () => {
      expect(() => FinancialCalculator.calculateTotals([])).toThrow(
        "Pesanan tidak boleh kosong.",
      );
    });

    it("harus melempar error jika kuantiti item adalah 0", () => {
      const items = [{ unitPrice: 25000, quantity: 0 }];
      expect(() => FinancialCalculator.calculateTotals(items)).toThrow(
        "Kuantiti item harus berupa bilangan bulat positif",
      );
    });

    it("harus melempar error jika kuantiti item bernilai negatif", () => {
      const items = [{ unitPrice: 25000, quantity: -2 }];
      expect(() => FinancialCalculator.calculateTotals(items)).toThrow(
        "Kuantiti item harus berupa bilangan bulat positif",
      );
    });

    it("harus melempar error jika harga satuan bernilai negatif", () => {
      const items = [{ unitPrice: -25000, quantity: 1 }];
      expect(() => FinancialCalculator.calculateTotals(items)).toThrow(
        "Harga satuan tidak boleh negatif",
      );
    });
  });

  describe("2. Kalkulasi Uang Kembalian (Cash Change Calculation)", () => {
    it("harus menghitung uang kembalian dengan benar saat uang dibayar melebihi total", () => {
      const grandTotal = BigInt(95000);
      const amountPaid = BigInt(100000);

      const result = FinancialCalculator.calculateChange(
        grandTotal,
        amountPaid,
      );

      expect(result.changeDue).toBe(BigInt(5000));
      expect(result.amountPaid).toBe(BigInt(100000));
      expect(result.grandTotal).toBe(BigInt(95000));
    });

    it("harus menghasilkan kembalian 0 saat uang bayar adalah uang pas", () => {
      const grandTotal = 95000;
      const amountPaid = 95000;

      const result = FinancialCalculator.calculateChange(
        grandTotal,
        amountPaid,
      );

      expect(result.changeDue).toBe(BigInt(0));
    });

    it("harus melempar error jika uang yang dibayarkan kurang dari total tagihan", () => {
      const grandTotal = 95000;
      const amountPaid = 50000; // Kurang Rp 45.000

      expect(() =>
        FinancialCalculator.calculateChange(grandTotal, amountPaid),
      ).toThrow("Nominal pembayaran kurang sebesar Rp 45.000");
    });
  });

  describe("3. Skalabilitas BigInt & Anti Floating-Point Bug", () => {
    it("harus menangani transaksi bernilai di atas batas integer biasa (Rp 2,14 Miliar) tanpa overflow", () => {
      // 100 paket catering roastery @ Rp 50.000.000 = Rp 5.000.000.000 (5 Miliar Rupiah)
      const items = [{ unitPrice: BigInt(50000000), quantity: 100 }];
      const result = FinancialCalculator.calculateTotals(items);

      const expectedTotal = BigInt(5000000000); // 5 Miliar
      expect(result.grandTotal).toBe(expectedTotal);

      // Pembayaran Rp 6 Miliar
      const paymentResult = FinancialCalculator.calculateChange(
        result.grandTotal,
        BigInt(6000000000),
      );
      expect(paymentResult.changeDue).toBe(BigInt(1000000000)); // Kembalian 1 Miliar
    });

    it("kebal dari bug floating point desimal (0.1 + 0.2 != 0.3)", () => {
      // Menjumlahkan 10 transaksi kecil bernilai bulat tidak boleh mengalami selisih desimal
      const items = Array.from({ length: 10 }, () => ({
        unitPrice: 15000,
        quantity: 1,
      }));
      const result = FinancialCalculator.calculateTotals(items);

      expect(result.grandTotal).toBe(BigInt(150000));
    });
  });
});
