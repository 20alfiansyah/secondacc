import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import MobileNav from '@/components/MobileNav'
import NavigationRail from '@/components/NavigationRail'
import TopBar from '@/components/TopBar'
import Icon from '@/components/ui/Icon'
import { useAuthStore } from '@/store/authStore'

interface DashboardLayoutProps {
  /** Halaman aktif — item nav yang menyala + breadcrumb TopBar. */
  page: string
  children: ReactNode
}

/**
 * Shell layout untuk seluruh halaman /dashboard (Task 2.0): NavigationRail
 * desktop (`hidden lg:flex`) + MobileNav untuk layar <lg + TopBar + main
 * konten scrollable — struktur 1:1 dengan layout POS (pages/POS.tsx).
 * Props POS-only (`onOpenHistory`/`onLockRegister`) diisi notice: Order
 * History dan lock register adalah fitur layar kasir, bukan dashboard.
 */
export default function DashboardLayout({ page, children }: DashboardLayoutProps) {
  const { logout } = useAuthStore()

  // Notice non-modal ala POS: banner di bawah TopBar, auto-hide 4 detik.
  const [notice, setNotice] = useState<string | null>(null)
  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(null), 4000)
    return () => window.clearTimeout(timer)
  }, [notice])

  return (
    <div className="flex h-svh flex-col bg-[#F8FAFC] text-slate-900 lg:flex-row">
      {/* Zone 1: top bar mobile (<lg) / rail desktop (≥lg) */}
      <MobileNav
        page={page}
        onOpenHistory={() => setNotice('Order History tersedia di layar Register (POS).')}
        onLockRegister={() => setNotice('Lock register hanya berlaku di layar Register (POS).')}
        onFeatureNotice={setNotice}
        onSignOut={logout}
      />
      <NavigationRail
        className="hidden lg:flex"
        page={page}
        onOpenHistory={() => setNotice('Order History tersedia di layar Register (POS).')}
        onLockRegister={() => setNotice('Lock register hanya berlaku di layar Register (POS).')}
        onFeatureNotice={setNotice}
        onSignOut={logout}
      />

      {/* Zone 2: konten scrollable */}
      <main className="flex min-w-0 flex-1 flex-col space-y-4 overflow-y-auto bg-[#F8FAFC] p-4 pb-24 lg:pb-4">
        <TopBar page={page} />
        {notice && (
          <div className="flex flex-shrink-0 items-center gap-2 rounded-xl border border-[#b9e2d3] bg-[#edf7f3] px-4 py-2.5 text-sm font-medium text-[#2d5258] shadow-xs">
            <Icon name="info" className="shrink-0 text-base" />
            <span>{notice}</span>
          </div>
        )}
        {children}
      </main>
    </div>
  )
}
