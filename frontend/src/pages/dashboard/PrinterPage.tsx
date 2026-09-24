import { useEffect, useState } from 'react'
import type { SavedPrinter } from '@/utils/escpos'
import { buildReceiptEscpos, clearSavedPrinter, isBluetoothPrintingSupported, loadSavedPrinter, pairPrinter, printEscpos } from '@/utils/escpos'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import Icon from '@/components/ui/Icon'
import { cn } from '@/lib/utils'

/**
 * Printer Setup — pasangkan printer thermal bluetooth (Web Bluetooth/BLE) dan
 * kirim test print. Device tersimpan di localStorage sehingga POS tinggal print.
 *
 * Catatan platform: Web Bluetooth hanya Chrome/Edge; printer harus BLE.
 * Bluetooth CLASSIC (SPP) tidak bisa dari browser — jalur itu lewat print dialog OS
 * (tombol Print di ReceiptModal tetap tersedia sebagai fallback).
 */
export default function PrinterPage() {
  const [printer, setPrinter] = useState<SavedPrinter | null>(null)
  const [busy, setBusy] = useState<'pair' | 'test' | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [supported, setSupported] = useState(true)

  useEffect(() => {
    setPrinter(loadSavedPrinter())
    setSupported(isBluetoothPrintingSupported())
  }, [])

  /** Pesan error Web Bluetooth yang bisa dipahami kasir (EN). */
  function describeBtError(err: unknown): string {
    const msg = err instanceof Error ? err.message : String(err)
    if (err instanceof DOMException && err.name === 'NotFoundError') {
      return 'No printer selected. Make sure the printer is on and in pairing range.'
    }
    if (err instanceof DOMException && err.name === 'NotFoundError') {
      return 'Printer not found — put it in pairing mode and try again.'
    }
    return `Bluetooth error: ${msg}`
  }

  async function handlePair() {
    setError(null)
    setBusy('pair')
    try {
      const printer = await pairPrinter()
      setPrinter(printer)
      setNotice(`Printer paired: ${printer.deviceName}`)
    } catch (err) {
      setError(describeBtError(err))
    } finally {
      setBusy(null)
    }
  }

  async function handleTest() {
    if (!printer) return
    setBusy('test')
    setError(null)
    try {
      const payload = buildReceiptEscpos({
        invoiceNumber: 'TEST-0001',
        customerName: null,
        cashierName: 'Admin',
        subtotal: 25000,
        grandTotal: 25000,
        items: [{ productName: 'Test Print — Kopi Susu Gula Aren', quantity: 1, unitPrice: 18000, subtotal: 18000 }],
        payment: { methodName: 'Tunai', amountPaid: 20000, changeDue: 2000 },
      })
      await printEscpos(printer.deviceId, payload)
      setNotice('Test receipt sent to printer.')
    } catch (err) {
      setError(describeBtError(err))
    } finally {
      setBusy(null)
    }
  }

  function handleForget() {
    clearSavedPrinter()
    setPrinter(null)
    setNotice('Printer removed from this browser.')
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Icon name="print" className="text-[20px] text-[#447C84]" />
              <span className="font-display text-xs font-bold uppercase tracking-wider text-slate-900">
                PRINTER SETUP
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Pair a Bluetooth thermal receipt printer (ESC/POS, 58mm). Works in Chrome or Edge.
            </p>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
          <div className="space-y-4">
            {!supported && (
              <p role="alert" className="rounded-xl bg-amber-50 px-3.5 py-2.5 text-xs font-semibold text-amber-700">
                This browser does not support Web Bluetooth. Use Chrome or Edge on desktop or Android.
              </p>
            )}

            <div
              className={cn(
                'flex items-center justify-between rounded-xl border px-4 py-3',
                printer ? 'border-[#65AF92]/40 bg-[#edf7f3]' : 'border-slate-200/80 bg-slate-50',
              )}
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-xl',
                    printer ? 'bg-[#65AF92]/15 text-[#3d8b6f]' : 'bg-slate-100 text-slate-400',
                  )}
                >
                  <Icon name="print" className="text-xl" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{printer ? printer.deviceName : 'No printer paired'}</p>
                  <p className="text-[11px] text-slate-400">
                    {printer ? 'Ready — receipts will print without dialogs.' : 'Pair your ESC/POS thermal printer to start printing.'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => void handlePair()} disabled={!supported || busy !== null}>
                  {printer ? 'Re-pair' : 'Pair Printer'}
                </Button>
                {printer && (
                  <Button variant="outline" onClick={() => void handleTest()} disabled={busy !== null}>
                    {busy === 'test' ? 'Printing...' : 'Test Print'}
                  </Button>
                )}
                {printer && (
                  <Button variant="outline" onClick={handleForget} disabled={busy !== null}>
                    Forget
                  </Button>
                )}
              </div>
            </div>
          </div>

          {notice && (
            <p role="status" className="rounded-xl bg-[#edf7f3] px-3.5 py-2.5 text-xs font-semibold text-[#2d5258]">
              {notice}
            </p>
          )}

          {error && (
            <p role="alert" className="rounded-xl bg-destructive/10 px-3.5 py-2.5 text-xs font-semibold text-destructive">
              {error}
            </p>
          )}

          <p className="text-xs leading-relaxed text-slate-400">
            How it works: press <b>Pair Printer</b> and pick your thermal printer in the Chrome chooser — the
            receipt is sent as raw ESC/POS commands over Bluetooth LE (paper cut included). The pairing is
            remembered in this browser. Bluetooth CLASSIC (SPP-only) printers are not reachable from browsers;
            for those, keep using the OS print dialog.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
