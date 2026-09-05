export interface OrderItemCalculationInput {
  unitPrice: bigint | number;
  quantity: number;
}

export interface OrderCalculationResult {
  subtotal: bigint;
  grandTotal: bigint;
  itemCount: number;
}

export interface PaymentChangeResult {
  grandTotal: bigint;
  amountPaid: bigint;
  changeDue: bigint;
}

export class FinancialCalculator {
  /**
   * Menghitung subtotal dan grand total dari daftar item pesanan.
   * Menggunakan BigInt untuk menjamin presisi keuangan tanpa bug floating point.
   */
  static calculateTotals(
    items: OrderItemCalculationInput[],
  ): OrderCalculationResult {
    if (!items || items.length === 0) {
      throw new Error("Pesanan tidak boleh kosong.");
    }

    let subtotal = BigInt(0);
    let itemCount = 0;

    for (const item of items) {
      if (item.quantity <= 0 || !Number.isInteger(item.quantity)) {
        throw new Error(
          `Kuantiti item harus berupa bilangan bulat positif (> 0). Nilai: ${item.quantity}`,
        );
      }

      const unitPrice = BigInt(item.unitPrice);
      if (unitPrice < BigInt(0)) {
        throw new Error(
          `Harga satuan tidak boleh negatif. Nilai: ${unitPrice}`,
        );
      }

      const itemSubtotal = unitPrice * BigInt(item.quantity);
      subtotal += itemSubtotal;
      itemCount += item.quantity;
    }

    return {
      subtotal,
      grandTotal: subtotal, // Nilai grand total kafe nett
      itemCount,
    };
  }

  /**
   * Menghitung uang kembalian untuk pembayaran tunai (Cash).
   * Memvalidasi bahwa uang yang dibayarkan pelanggan mencukupi total tagihan.
   */
  static calculateChange(
    grandTotalInput: bigint | number,
    amountPaidInput: bigint | number,
  ): PaymentChangeResult {
    const grandTotal = BigInt(grandTotalInput);
    const amountPaid = BigInt(amountPaidInput);

    if (grandTotal < BigInt(0)) {
      throw new Error("Total tagihan tidak boleh negatif.");
    }

    if (amountPaid < grandTotal) {
      const deficiency = grandTotal - amountPaid;
      throw new Error(
        `Nominal pembayaran kurang sebesar Rp ${deficiency.toLocaleString("id-ID")}. Total: Rp ${grandTotal.toLocaleString("id-ID")}, Dibayar: Rp ${amountPaid.toLocaleString("id-ID")}`,
      );
    }

    const changeDue = amountPaid - grandTotal;

    return {
      grandTotal,
      amountPaid,
      changeDue,
    };
  }
}
