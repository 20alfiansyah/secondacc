/** Format angka (rupiah) menjadi teks: 28000 -> "Rp 28.000". */
export function formatRupiah(value: number): string {
  return `Rp ${value.toLocaleString('id-ID')}`
}

/** Nomor order dengan padding nol minimal 3 digit: 42 -> "#042". */
export function formatOrderLabel(id: number): string {
  return `#${String(id).padStart(3, '0')}`
}
