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

/** Service + characteristic standar printer thermal BLE (ESC/POS over BLE). */
const PRINTER_SERVICE_UUID = 0xff00
const PRINTER_CHARACTERISTIC_UUID = 0xff02
/** Fallback: beberapa printer pakai Nordic UART-style service 0x18f0/0x2af1. */
const PRINTER_SERVICE_ALT_UUID = 0x18f0

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
 * Pasangkan printer thermal via chooser Chrome. Device tetap tersimpan di
 * localStorage (allowedDevices) sehingga print berikutnya tanpa dialog.
 */
export async function pairPrinter(): Promise<SavedPrinter> {
  const device = await navigator.bluetooth.requestDevice({
    filters: [{ services: [PRINTER_SERVICE_UUID] }],
    optionalServices: [PRINTER_SERVICE_UUID, PRINTER_SERVICE_ALT_UUID],
  })
  device.addEventListener('gattserverdisconnected', () => {
    // Hanya state runtime — device tersimpan tetap dipakai lagi saat print berikutnya.
  })
  const saved: SavedPrinter = { deviceId: device.id ?? '', deviceName: device.name ?? 'Thermal printer' }
  savePrinter(saved)
  return saved
}

/** Koneksi GATT aktif dari device tersimpan (reconnect otomatis bila putus). */
export async function connectPrinter(deviceId: string): Promise<BluetoothRemoteGATTServer> {
  const device = await navigator.bluetooth.getDevices().then((ds) => ds.find((d) => d.id === deviceId))
  if (!device) throw new Error('Paired printer not found in this browser. Pair again from Printer Setup.')
  const gatt = device.gatt ?? null
  if (!gatt) throw new Error('Printer GATT unavailable.')
  return gatt.connected ? gatt : await gatt.connect()
}

/**
 * Kirim payload ESC/POS ke printer. Menulis per chunk 20 byte (MTU BLE aman)
 * dengan delay kecil — printer murah sering kehilangan byte pada tulisan besar.
 */
export async function printEscpos(deviceId: string, payload: Uint8Array): Promise<void> {
  const server = await connectPrinter(deviceId)
  let service: BluetoothRemoteGATTService | null = null
  try {
    service = await server.getPrimaryService(PRINTER_SERVICE_UUID)
  } catch {
    service = await server.getPrimaryService(PRINTER_SERVICE_ALT_UUID)
  }
  const characteristic = await service.getCharacteristic(PRINTER_CHARACTERISTIC_UUID)

  const CHUNK = 100
  for (let i = 0; i < payload.length; i += CHUNK) {
    await characteristic.writeValue(payload.slice(i, i + CHUNK))
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
  center('CAFE POS')
  setDouble(false)
  align(0)
  center('Roastery & Coffee')
  dashed()

  for (const l of [
    `Invoice: ${receipt.invoiceNumber}`,
    `Date   : ${formatDate(new Date().toISOString())}`,
    `Cashier: ${receipt.cashierName ?? '-'}`,
    `Customer: ${receipt.customerName ?? '-'}`,
  ]) {
    text(l)
    lineFeed()
  }
  dashed()

  // Item: nama 1 baris; qty x harga (kiri) & subtotal (kanan).
  for (const item of receipt.items) {
    text(item.productName.slice(0, RECEIPT_WIDTH))
    lineFeed()
    row(`  ${item.quantity} x ${item.unitPrice.toLocaleString('id-ID')}`, item.subtotal.toLocaleString('id-ID'))
  }
  dashed()

  row('Subtotal', formatRupiahPlain(receipt.subtotal))
  row('Total', formatRupiahPlain(receipt.grandTotal))
  row(receipt.payment.methodName, formatRupiahPlain(receipt.payment.amountPaid ?? 0))
  row('Change', formatRupiahPlain(receipt.payment.changeDue ?? 0))
  dashed()
  center('Thank you! Please come again.')
  lineFeed(3)
  cut()

  return new Uint8Array(bytes)
}

/** Rupiah tanpa "Rp " prefix — struk thermal lebar terbatas. */
function formatRupiahPlain(value: number): string {
  return value.toLocaleString('id-ID')
}

/** Bentuk data minimal untuk struk (CheckoutResult | OrderDetail dipetakan ke sini). */
export interface ReceiptData {
  invoiceNumber: string
  customerName: string | null
  cashierName: string | null
  subtotal: number
  grandTotal: number
  items: Array<{ productName: string; quantity: number; unitPrice: number; subtotal: number }>
  payment: { methodName: string; amountPaid?: number; changeDue?: number }
}
