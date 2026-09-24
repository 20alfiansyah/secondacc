import Icon from '@/components/ui/Icon'
import type { CheckoutResult, OrderDetail } from '@/api/client'
import { formatDate, formatRupiah } from '@/utils/format'
import { buildReceiptEscpos, isBluetoothPrintingSupported, loadSavedPrinter, printEscpos } from '@/utils/escpos'
import { useState } from 'react'

const CAFE_NAME = 'CAFE POS'

interface ReceiptModalProps {
  /** CheckoutResult (alur bayar) atau OrderDetail (re-print dari riwayat). */
  order: CheckoutResult | OrderDetail
  onClose: () => void
}

/** Peta bentuk struk (CheckoutResult | OrderDetail) → data minimal builder ESC/POS. */
function toReceiptData(order: CheckoutResult | OrderDetail) {
  return {
    invoiceNumber: order.invoiceNumber,
    customerName: order.customerName,
    cashierName: order.cashierName,
    subtotal: 'subtotal' in order ? order.subtotal : order.grandTotal,
    grandTotal: order.grandTotal,
    items: order.items.map((item) => ({
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotal: item.subtotal,
    })),
    payment: { methodName: order.payment?.methodName ?? '-' },
  }
}

export default function ReceiptModal({ order, onClose }: ReceiptModalProps) {
  // Printer thermal tersimpan (Web Bluetooth) — null = pakai dialog print OS.
  const printer = isBluetoothPrintingSupported() ? loadSavedPrinter() : null
  const [btState, setBtState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [btError, setBtError] = useState<string | null>(null)

  /** Print via Bluetooth LE bila printer tersimpan; gagal → fallback dialog OS. */
  async function handleBtPrint() {
    const printer = loadSavedPrinter()
    if (!printer) {
      window.print()
      return
    }
    setBtState('sending')
    setBtError(null)
    const payload = buildReceiptEscpos(toReceiptData(order))
    try {
      await printEscpos(printer.deviceId, payload)
      setBtState('sent')
    } catch {
      // Printer mati/out-of-range → fallback dialog print OS supaya kasir tidak macet.
      setBtState('error')
      setBtError('Bluetooth print failed — opening the system print dialog instead.')
      window.print()
    }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-sm overflow-hidden rounded-3xl border border-border/80 bg-card shadow-modal animate-in zoom-in-95 duration-150">
        {/* Bar aksi (tidak ikut tercetak saat window.print) */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Icon name="check_circle" className="text-base text-primary" />
            <h2 className="font-display text-sm font-bold text-slate-900">Receipt</h2>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => void handleBtPrint()}
              disabled={btState === 'sending'}
              title={printer ? `Print via ${printer.deviceName}` : 'Print via system dialog'}
              className="flex h-8 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 font-display text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50 active:scale-95 disabled:opacity-50"
            >
              <Icon name="print" className="text-sm" />
              {btState === 'sending' ? 'Printing...' : printer ? 'Print (BT)' : 'Print'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-800"
            >
              <Icon name="close" className="text-base" />
            </button>
          </div>
        </div>

        {/* Status print bluetooth — di luar area cetak struk. */}
        {btError && (
          <p role="alert" className="border-b border-amber-100 bg-amber-50 px-5 py-2 text-[11px] font-semibold text-amber-700">
            {btError}
          </p>
        )}
        {btState === 'sent' && (
          <p role="status" className="border-b border-emerald-100 bg-emerald-50 px-5 py-2 text-xs font-semibold text-[#2d7a5f]">
            Sent to {printer?.deviceName}.
          </p>
        )}
        {/* Struk Fisik Thermal (area yang dicetak & dipratinjau) */}
        <div className="p-6 bg-slate-50">
          <div className="receipt rounded-2xl border border-dashed border-border/80 bg-card p-4 shadow-subtle">
            <div className="receipt__head text-center">
              <p className="receipt__name text-base font-extrabold tracking-wider text-foreground">
                {CAFE_NAME}
              </p>
              <p className="receipt__meta mt-1 text-[11px] text-muted-foreground">
                Invoice: {order.invoiceNumber}
              </p>
              {order.customerName && (
                <p className="receipt__meta text-[11px] text-muted-foreground">
                  Customer: {order.customerName}
                </p>
              )}
              <p className="receipt__meta text-[11px] text-muted-foreground">
                {formatDate(order.payment?.paidAt ?? null)}
              </p>
            </div>

            <div className="my-3 border-t border-dashed border-border" />

            <div className="space-y-2">
              {order.items.map((item, idx) => (
                <div key={idx}>
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="receipt__line text-foreground">{item.productName}</span>
                    <span className="receipt__line tabular-nums text-foreground">
                      {formatRupiah(item.unitPrice * item.quantity)}
                    </span>
                  </div>
                  <div className="receipt__line receipt__line--dim text-[11px] text-muted-foreground tabular-nums">
                    {item.quantity} x {formatRupiah(item.unitPrice)}
                    {item.notes ? ` • (${item.notes})` : ''}
                  </div>
                </div>
              ))}
            </div>

            <div className="my-3 border-t border-dashed border-border" />

            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Subtotal</span>
              <span className="tabular-nums font-medium">{formatRupiah(order.grandTotal)}</span>
            </div>
            <div className="mt-1 flex justify-between text-sm font-bold text-foreground">
              <span>Grand Total</span>
              <span className="receipt__total tabular-nums text-primary font-black">
                {formatRupiah(order.grandTotal)}
              </span>
            </div>

            <div className="my-3 border-t border-dashed border-border" />

            {order.payment && (
              <>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Payment Method</span>
                  <span className="font-semibold text-foreground">{order.payment.methodName}</span>
                </div>
                <div className="mt-0.5 flex justify-between text-xs text-muted-foreground">
                  <span>Cash Received</span>
                  <span className="tabular-nums font-semibold text-foreground">
                    {formatRupiah(order.payment.amountPaid)}
                  </span>
                </div>
                {order.payment.changeDue > 0 && (
                  <div className="mt-0.5 flex justify-between text-xs text-emerald-700 font-bold">
                    <span>Change</span>
                    <span className="tabular-nums font-black text-emerald-700">
                      {formatRupiah(order.payment.changeDue)}
                    </span>
                  </div>
                )}
              </>
            )}

            <div className="receipt__footer mt-4 border-t border-dashed border-border pt-3 text-center text-[11px] text-muted-foreground">
              Thank you for your visit! 🙏
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

