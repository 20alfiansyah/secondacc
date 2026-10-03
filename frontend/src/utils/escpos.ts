import { formatDate } from './format'

/**
 * ESC/POS printer via Web Bluetooth (BLE) — Task printer bluetooth.
 * Kontrak:
 * - Struk 58mm (32 karakter per baris standar), command ESC/POS murni (Uint8Array).
 * - Device disimpan di localStorage (ID Web Bluetooth persisten lintas reload).
 * - Pure builder `buildReceiptEscpos` TIDAK menyentuh Bluetooth → mudah dites.
 *
 * Batas platform (ponytail): Web Bluetooth hanya Chrome/Edge; printer harus BLE
 * (thermal bluetooth modern umumnya BLE + service 'ecbe3980-c9a2-11e1-b1bd-0002a5d5c51b').
 * Printer bluetooth CLASSIC (SPP) tidak didukung browser — jalur itu pakai print dialog OS.
 */

/**
 * Kandidat service printer thermal BLE (ESC/POS over BLE):
 * - 0xff00/0xff02: umum di printer China
 * - 0x18f0/0x2af1: Nordic UART-style
 * - 0xffe0/0xffe1: modul HM-10/BLE umum di printer murah
 * - 0xae00: beberapa printer generasi baru
 */
const PRINTER_SERVICE_CANDIDATES = [0xff00, 0x18f0, 0xffe0, 0xae00]

/** Lebar struk 58mm → 32 kolom huruf normal (font A). */
export const RECEIPT_WIDTH = 32

/** Karakter ESC/POS kunci. */
const ESC = 0x1b
const GS = 0x1d

/** Router/printer tidak ikut webhook; cukup cek dukungan browser sekali. */
export function isBluetoothPrintingSupported(): boolean {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator
}

/** Perangkat tersimpan (persistent pairing) — null = belum pernah pair. */
export interface SavedPrinter {
  deviceId: string
  deviceName: string
}

const STORAGE_KEY = 'cafe_pos_printer'

/**
 * Cache sesi object BluetoothDevice — untuk browser TANPA
 * navigator.bluetooth.getDevices() (Chrome < 110): pairing tetap bisa
 * dipakai selama halaman belum di-reload.
 */
const sessionDevices = new Map<string, BluetoothDevice>()

export function loadSavedPrinter(): SavedPrinter | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as SavedPrinter) : null
  } catch {
    return null
  }
}

export function savePrinter(printer: SavedPrinter): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(printer))
}

export function clearSavedPrinter(): void {
  localStorage.removeItem(STORAGE_KEY)
}

/**
 * Pasangkan printer thermal via chooser Chrome. Semua perangkat BLE tampil
 * (acceptAllDevices) karena service UUID jarang diiklankan; device tetap
 * tersimpan di localStorage (allowedDevices) → print berikutnya tanpa dialog.
 */
export async function pairPrinter(): Promise<SavedPrinter> {
  const device = await navigator.bluetooth.requestDevice({
    // Tampilkan SEMUA perangkat BLE di chooser — kebanyakan printer tidak
    // mengiklankan service UUID di advertisement, filter [0xff00] membuatnya
    // tidak pernah muncul. Service dicocokkan saat print (kandidat di atas).
    acceptAllDevices: true,
    optionalServices: [...PRINTER_SERVICE_CANDIDATES],
  })
  // Simpan object device di cache sesi — dipakai connectPrinter pada browser
  // tanpa getDevices().
  sessionDevices.set(device.id, device)
  const saved: SavedPrinter = { deviceId: device.id, deviceName: device.name ?? 'Thermal printer' }
  savePrinter(saved)
  return saved
}

/**
 * Koneksi GATT aktif dari device tersimpan (reconnect otomatis bila putus).
 * Chrome ≥ 110: device diambil dari getDevices() (persist antar reload).
 * Chrome lebih lama: pakai cache sesi dari pairPrinter terakhir.
 */
export async function connectPrinter(deviceId: string): Promise<BluetoothRemoteGATTServer> {
  let device: BluetoothDevice | undefined
  if (typeof navigator.bluetooth.getDevices === 'function') {
    device = (await navigator.bluetooth.getDevices()).find((d) => d.id === deviceId)
  } else {
    device = sessionDevices.get(deviceId)
  }
  if (!device) throw new Error('Paired printer not found in this browser. Pair again from Printer Setup.')
  const gatt = device.gatt ?? null
  if (!gatt) throw new Error('Printer GATT unavailable.')
  return gatt.connected ? gatt : await gatt.connect()
}

/**
 * Kirim payload ESC/POS ke printer. Menulis per chunk 100 byte dengan delay
 * kecil — printer murah sering kehilangan byte pada tulisan besar sekaligus.
 */
export async function printEscpos(deviceId: string, payload: Uint8Array): Promise<void> {
  const server = await connectPrinter(deviceId)
  // Cocokkan service dari kandidat; pilih characteristic pertama yang writable.
  // (Nama service/char berbeda antar merk — jangan pinjam satu UUID keras.)
  let target: BluetoothRemoteGATTCharacteristic | null = null
  for (const uuid of PRINTER_SERVICE_CANDIDATES) {
    try {
      const service = await server.getPrimaryService(uuid)
      const chars = await service.getCharacteristics()
      target = chars.find((c) => c.properties.write || c.properties.writeWithoutResponse) ?? null
      if (target) break
    } catch {
      // Printer ini tidak punya service kandidat tsb — coba berikutnya.
    }
  }
  if (!target) {
    throw new Error('Printer service not found — the paired device may not be an ESC/POS BLE printer.')
  }

  const CHUNK = 100
  for (let i = 0; i < payload.length; i += CHUNK) {
    await target.writeValue(payload.slice(i, i + CHUNK))
    // Beri napas BLE antar chunk — printer murah drop karakter tanpa ini.
    await new Promise((resolve) => setTimeout(resolve, 20))
  }
}

/**
 * Builder ESC/POS struk (pure, tanpa Bluetooth) — 58mm/32 kolom.
 * Bagian kiri, isi kanan rata: name spasi dot spasi nilai.
 */
export function buildReceiptEscpos(receipt: ReceiptData): Uint8Array {
  const bytes: number[] = []

  const setDouble = (on: boolean): void => {
    // Besarkan ukuran huruf 2x untuk judul/nominal.
    bytes.push(GS, 0x21, on ? 0x11 : 0x00)
  }
  const align = (mode: 0 | 1 | 2): void => {
    bytes.push(ESC, 0x61, mode)
  }
  const text = (s: string): void => {
    for (const ch of s) bytes.push(ch.charCodeAt(0) & 0xff)
  }
  const lineFeed = (n = 1): void => {
    for (let i = 0; i < n; i++) bytes.push(0x0a)
  }
  const cut = (): void => {
    bytes.push(GS, 0x56, 0x42, 0x00) // partial cut
  }

  const row = (left: string, right: string): void => {
    const rightLen = right.length
    const leftMax = RECEIPT_WIDTH - rightLen
    const l = left.length > leftMax ? left.slice(0, leftMax) : left
    text(l + ' '.repeat(RECEIPT_WIDTH - l.length - right.length) + right)
    lineFeed()
  }
  const center = (s: string): void => {
    const pad = Math.max(0, Math.floor((RECEIPT_WIDTH - s.length) / 2))
    text(' '.repeat(pad) + s)
    lineFeed()
  }
  const dashed = (): void => {
    text('-'.repeat(RECEIPT_WIDTH))
    lineFeed()
  }
  // Init printer reset state (ESC @) — wajib sebelum command lain.
  bytes.push(ESC, 0x40)
  // Judul toko besar di tengah; tagline normal.
  align(1)
  setDouble(true)
  center('2ND ACC')
  setDouble(false)
  align(0)
  center('Roastery & Coffee')
  dashed()

  // Metadata — persis pratinjau web: invoice, customer (bila ada), tanggal transaksi.
  for (const l of [
    `Invoice: ${receipt.invoiceNumber}`,
    ...(receipt.customerName ? [`Customer: ${receipt.customerName}`] : []),
    ...(receipt.paidAt ? [formatDate(receipt.paidAt)] : []),
  ]) {
    text(l)
    lineFeed()
  }
  dashed()

  // Item: nama 1 baris; dim line "qty x harga (catatan)" (kiri) & line total (kanan).
  for (const item of receipt.items) {
    text(item.productName.slice(0, RECEIPT_WIDTH))
    lineFeed()
    const dim = `  ${item.quantity} x ${item.unitPrice.toLocaleString('id-ID')}${item.notes ? ` (${item.notes})` : ''}`
    row(dim.slice(0, RECEIPT_WIDTH), item.subtotal.toLocaleString('id-ID'))
  }
  dashed()

  // Total & pembayaran — label sama dengan pratinjau web.
  row('Subtotal', formatRupiahPlain(receipt.subtotal))
  row('Grand Total', formatRupiahPlain(receipt.grandTotal))
  row('Payment Method', receipt.payment.methodName)
  row('Cash Received', formatRupiahPlain(receipt.payment.amountPaid ?? 0))
  if ((receipt.payment.changeDue ?? 0) > 0) {
    row('Change', formatRupiahPlain(receipt.payment.changeDue ?? 0))
  }
  dashed()
  center('Thank you for your visit!')
  lineFeed(3)
  cut()

  return new Uint8Array(bytes)
}

/** Rupiah tanpa "Rp " prefix — struk thermal lebar terbatas. */
function formatRupiahPlain(value: number): string {
  return value.toLocaleString('id-ID')
}

/** Bentuk data struk (CheckoutResult | OrderDetail dipetakan via toReceiptData). */
export interface ReceiptData {
  invoiceNumber: string
  customerName: string | null
  /** Tanggal transaksi (payment.paidAt) — reprint tampil tanggal asli. */
  paidAt: string | null
  subtotal: number
  grandTotal: number
  items: Array<{
    productName: string
    quantity: number
    unitPrice: number
    subtotal: number
    notes?: string | null
  }>
  payment: { methodName: string; amountPaid?: number; changeDue?: number }
}
