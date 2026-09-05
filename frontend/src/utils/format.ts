/** Format angka (rupiah) menjadi teks: 28000 -> "Rp 28.000". */
export function formatRupiah(value: number): string {
  return `Rp ${value.toLocaleString('id-ID')}`
}
