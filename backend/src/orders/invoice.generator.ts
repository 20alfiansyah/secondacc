/**
 * Generator nomor order harian & invoice number.
 * - orderNumber: "Order #001" (reset per hari)
 * - invoiceNumber: "INV-YYYYMMDD-XXXX"
 *
 * Sequence dihitung di dalam transaksi ACID tempat order dibuat, dengan
 * query `findFirst` terhadap order hari ini (orderBy id desc) sehingga
 * aman terhadap race sederhana tanpa perlu lock terpisah.
 */

/** Format tanggal lokal YYYYMMDD dari sebuah Date. */
export function toDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

/**
 * Membangun orderNumber & invoiceNumber untuk sequence ke-n (1-based) pada
 * hari dengan `dateKey` (YYYYMMDD).
 */
export function buildInvoice(dateKey: string, seq: number): {
  orderNumber: string;
  invoiceNumber: string;
} {
  const padded = String(seq).padStart(4, '0');
  return {
    orderNumber: `Order #${String(seq).padStart(3, '0')}`,
    invoiceNumber: `INV-${dateKey}-${padded}`,
  };
}

/** Ekstrak sequence integer dari invoice number (X di INV-YYYYMMDD-XXXX). */
export function extractSequence(invoiceNumber: string): number {
  const match = /INV-\d{8}-(\d+)$/.exec(invoiceNumber);
  return match ? parseInt(match[1], 10) : 0;
}

/** Prefix invoiceNumber harian yang cocok utk query findFirst (INV-YYYYMMDD-). */
export function dailyPrefix(date: Date = new Date()): string {
  return `INV-${toDateKey(date)}-`;
}
