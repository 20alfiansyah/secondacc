import { useEffect, useState } from 'react'
import Icon from '@/components/ui/Icon'
import { cn } from '@/lib/utils'
import type { SavedPrinter } from '@/utils/escpos'
import { isBluetoothPrintingSupported, loadSavedPrinter, PRINTER_CHANGED_EVENT } from '@/utils/escpos'

/**
 * TopBar — header card di dalam main content (Stitch screen1 markup 1:1).
 * Kiri: breadcrumb POS • <page>. Kanan: pill status printer (MENGIKUTI pairing
 * nyata — sinkron via event + storage), sync info, dan tombol Sync (display-only).
 */
export default function TopBar({ page }: { page: string }) {
  // Pairing tersimpan di localStorage — dibaca saat mount & saat pairing berubah.
  const [printer, setPrinter] = useState<SavedPrinter | null>(() =>
    isBluetoothPrintingSupported() ? loadSavedPrinter() : null,
  )

  useEffect(() => {
    const sync = () => setPrinter(isBluetoothPrintingSupported() ? loadSavedPrinter() : null)
    window.addEventListener(PRINTER_CHANGED_EVENT, sync) // tab yang sama (pair/forget)
    window.addEventListener('storage', sync) // sinkron lintas tab
    return () => {
      window.removeEventListener(PRINTER_CHANGED_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  return (
    <header className="flex h-12 flex-shrink-0 items-center justify-between rounded-xl border border-slate-200/80 bg-white px-4 shadow-xs">
      <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
        <Icon name="storefront" className="text-[17px] text-[#447C84]" />
        <span className="font-display text-[11px] font-bold uppercase tracking-wider text-slate-700">
          POS
        </span>
        <span className="select-none text-xs text-slate-300">•</span>
        <span className="font-semibold text-[#2d5258]">{page}</span>
      </div>

      <div className="flex items-center gap-3">
        {/* Pill printer: hijau bila printer sudah dipasangkan, abu bila belum. */}
        <div
          className={cn(
            'flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs shadow-xs',
            printer ? 'border-[#65AF92]/40 bg-[#edf7f3]' : 'border-slate-200 bg-slate-50',
          )}
          title={printer ? `Paired: ${printer.deviceName}` : 'No printer paired — set up in Printer menu'}
        >
          <span className={cn('h-2 w-2 rounded-full', printer ? 'animate-pulse bg-[#65AF92]' : 'bg-slate-300')} />
          <span
            className={cn(
              // Truncate agresif di layar sempit — cegah pill menabrak crumb/Sync.
              'max-w-[110px] truncate text-[11px] font-semibold sm:max-w-[160px]',
              printer ? 'text-[#2d5258]' : 'text-slate-400',
            )}
          >
            {printer ? `Printer: ${printer.deviceName}` : 'Printer: Not paired'}
          </span>
        </div>
        <div className="hidden items-center gap-1.5 text-xs text-slate-500 sm:flex">
          <Icon name="cloud_done" className="text-[16px] text-[#447C84]" />
          <span className="text-[11px] font-medium">Sync: Up to date</span>
        </div>
        {/* Sync display-only (belum ada backend) — disembunyikan di layar sempit
            agar pill printer tidak terdorong keluar viewport. */}
        <button
          type="button"
          title="Force Cloud Sync"
          className="hidden h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-medium text-slate-700 shadow-xs transition active:scale-95 hover:bg-slate-100 hover:text-slate-900 sm:flex"
        >
          <Icon name="sync" className="text-[15px] text-slate-500" />
          <span className="text-[11px] font-medium">Sync</span>
        </button>
      </div>
    </header>
  )
}
