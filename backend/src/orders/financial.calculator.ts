/**
 * Financial Calculator — kalkulasi uang POS Cafe.
 *
 * PENTING (AGENTS.md Guardrail #1): uang WAJIB representasi integer (Rupiah
 * bulat, satuan terkecil). Kami melarang input floating-point: fungsi ini
 * menolak nilai non-integer sehingga bug `0.1 + 0.2 !== 0.3` tidak mungkin
 * terjadi. Gunakan `Int`/`BigInt` dari Prisma di lapisan persistence.
 */

/** Error khusus untuk pembayaran tunai yang kurang dari grand total. */
export class InsufficientPaymentError extends Error {
  constructor(grandTotal: number, amountPaid: number) {
    super(
      `Pembayaran kurang: amountPaid ${amountPaid} < grandTotal ${grandTotal}`,
    );
    this.name = 'InsufficientPaymentError';
  }
}

/** Error untuk input uang/kuantitas yang tidak valid (negatif, nol, atau float). */
export class InvalidMoneyInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidMoneyInputError';
  }
}

/**
 * Validasi nilai uang/kuantitas: harus integer aman (Number.isSafeInteger)
 * dan tidak boleh negatif (dan untuk qty tidak boleh nol).
 */
export function assertValidAmount(value: number, label: string, opts?: { positive?: boolean }): void {
  if (!Number.isSafeInteger(value)) {
    throw new InvalidMoneyInputError(
      `${label} harus integer (bukan float): ${value}. Uang memakai Rupiah bulat.`,
    );
  }
  if (value < 0) {
    throw new InvalidMoneyInputError(`${label} tidak boleh negatif: ${value}`);
  }
  if (opts?.positive && value === 0) {
    throw new InvalidMoneyInputError(`${label} harus lebih besar dari 0: ${value}`);
  }
}

/**
 * Subtotal satu item = quantity x unitPrice.
 * quantity wajib > 0, price wajib >= 0, keduanya integer bulat.
 */
export function calculateItemSubtotal(quantity: number, unitPrice: number): number {
  assertValidAmount(quantity, 'quantity', { positive: true });
  assertValidAmount(unitPrice, 'unitPrice', { positive: true });
  return quantity * unitPrice;
}

/**
 * Grand total order = penjumlahan subtotal semua item.
 * Setiap item dihitung via calculateItemSubtotal agar float tertolak.
 */
export function calculateGrandTotal(
  items: { quantity: number; unitPrice: number }[],
): number {
  return items.reduce((sum, item) => sum + calculateItemSubtotal(item.quantity, item.unitPrice), 0);
}

/**
 * Kembalian tunai = amountPaid - grandTotal.
 * Melempar InsufficientPaymentError jika amountPaid < grandTotal.
 */
export function calculateCashChange(amountPaid: number, grandTotal: number): number {
  assertValidAmount(amountPaid, 'amountPaid', { positive: true });
  assertValidAmount(grandTotal, 'grandTotal', { positive: true });
  if (amountPaid < grandTotal) {
    throw new InsufficientPaymentError(grandTotal, amountPaid);
  }
  return amountPaid - grandTotal;
}
