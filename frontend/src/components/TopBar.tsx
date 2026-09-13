import Icon from '@/components/ui/Icon'


/**
 * TopBar — header card di dalam main content (Stitch screen1 markup 1:1).
 * Kiri: breadcrumb POS • Register. Kanan: status pill printer, sync info,
 * dan tombol Sync. Semua status di kanan masih display-only statis:
 * integrasi printer/sync backend menyusul (keputusan user: compatibility nanti).
 */
export default function TopBar({ page }: { page: string }) {
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
        {/* Display-only: printer & cloud sync belum ada backend-nya. */}
        <div className="flex items-center gap-2 rounded-full border border-[#65AF92]/40 bg-[#edf7f3] px-2.5 py-1 text-xs shadow-xs">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#65AF92]" />
          <span className="text-[11px] font-semibold text-[#2d5258]">Printer: Ready</span>
        </div>
        <div className="hidden items-center gap-1.5 text-xs text-slate-500 sm:flex">
          <Icon name="cloud_done" className="text-[16px] text-[#447C84]" />
          <span className="text-[11px] font-medium">Sync: Up to date</span>
        </div>
        <button
          type="button"
          title="Force Cloud Sync"
          className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-medium text-slate-700 shadow-xs transition active:scale-95 hover:bg-slate-100 hover:text-slate-900"
        >
          <Icon name="sync" className="text-[15px] text-slate-500" />
          <span className="text-[11px] font-medium">Sync</span>
        </button>
      </div>
    </header>
  )
}
