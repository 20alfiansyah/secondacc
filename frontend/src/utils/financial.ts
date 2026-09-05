/**
 * Kalkulator keuangan frontend — mirror dari logika backend
 * (FinancialCalculator). Uang selalu integer (rupiah bulat),
 * tanpa floating-point, untuk menghindari bug pembulatan.
 */

/** Hitung kembalian tunai. Melempar error jika uang kurang dari total. */
export function calculateChange(grandTotal: number, amountPaid: number): number {
  if (!Number.isInteger(grandTotal) || !Number.isInteger(amountPaid)) {
    throw new Error('Nominal harus berupa bilangan bulat (rupiah).')
  }
  if (grandTotal < 0) {
    throw new Error('Total tagihan tidak boleh negatif.')
  }
  if (amountPaid < grandTotal) {
    throw new Error(
      `Uang tidak cukup: total ${grandTotal}, dibayar ${amountPaid}, kurang ${grandTotal - amountPaid}.`,
    )
  }
  return amountPaid - grandTotal
}

/** Jumlah uang bulat agar pembayaran >= total (tombol "uang pas"). */
export function exactPayment(total: number): number {
  return total
}
