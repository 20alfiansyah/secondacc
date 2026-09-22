/** Format angka (rupiah) menjadi teks: 28000 -> "Rp 28.000". */
export function formatRupiah(value: number): string {
  return `Rp ${value.toLocaleString('id-ID')}`
}

/** Nomor order dengan padding nol minimal 3 digit: 42 -> "#042". */
export function formatOrderLabel(id: number): string {
  return `#${String(id).padStart(3, '0')}`
}

/** Tanggal+waktu panel order (mis. "Sep 19, 2026, 02:05 PM"), en-US. null/invalid -> ''. */
export function formatDateTime(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Tanggal+waktu struk (bulan 2 digit: "09/19/2026, 02:05 PM"), en-US. null -> ''. */
export function formatDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleString('en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Jam pendek utk baris history (mis. 21:04), en-US 24 jam. Invalid -> ''. */
export function formatTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

/** Kunci hari timezone lokal (YYYY-MM-DD) — pembanding filter Today/Yesterday. */
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
