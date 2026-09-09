import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart3,
  CalendarClock,
  Coffee,
  CreditCard,
  History,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Store,
  User,
  Users,
  UtensilsCrossed,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'

interface NavigationRailProps {
  /** Buka slide-over drawer riwayat transaksi (Task 1.3.10). */
  onOpenHistory: () => void
  /** Kunci register (kunci sesi kasir saat ini, tanpa logout). */
  onLockRegister: () => void
  /** Callback opsional jika kasir mengklik menu yang belum tersedia. */
  onFeatureNotice?: (featureName: string) => void
}

/** Ambil inisial nama (mis. "Nahid Zaman" -> "NZ", "Siti" -> "S") untuk avatar. */
function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('')
}

interface NavItem {
  id: string
  label: string
  icon: LucideIcon
  badge?: string
  badgeColor?: string
  active?: boolean
  onClick: () => void
}

/**
 * RestroBit-style Collapsible Sidebar Navigation Rail.
 * Mendukung mode penuh (~240px) dengan profile card, header group menu, dan badge,
 * serta mode ringkas rail (~64px) dengan animasi transisi yang mulus.
 */
export default function NavigationRail({
  onOpenHistory,
  onLockRegister,
  onFeatureNotice,
}: NavigationRailProps) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  // State collapsed yang dipertahankan di localStorage
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('cafe_pos_sidebar_collapsed') === 'true'
    } catch {
      return false
    }
  })

  function toggleCollapse() {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem('cafe_pos_sidebar_collapsed', String(next))
      } catch {
        // ignore
      }
      return next
    })
  }

  function handleNotice(name: string) {
    if (onFeatureNotice) {
      onFeatureNotice(name)
    }
  }

  // Grup 1: Menu Utama
  const mainItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      onClick: () => {
        if (user?.role === 'ADMIN') {
          navigate('/dashboard')
        } else {
          handleNotice('Dashboard Admin hanya dapat diakses oleh Administrator.')
        }
      },
    },
    {
      id: 'pos',
      label: 'POS',
      icon: Store,
      active: true,
      onClick: () => navigate('/pos'),
    },
    {
      id: 'table',
      label: 'Table',
      icon: UtensilsCrossed,
      onClick: () => handleNotice('Manajemen Meja (Table) akan hadir di fase reservasi.'),
    },
    {
      id: 'reservations',
      label: 'Reservations',
      icon: CalendarClock,
      onClick: () => handleNotice('Fitur Reservasi Meja akan hadir di fase berikutnya.'),
    },
  ]

  // Grup 2: Offering / Operasional
  const offeringItems: NavItem[] = [
    {
      id: 'history',
      label: 'Order History',
      icon: History,
      onClick: onOpenHistory,
    },
    {
      id: 'payments',
      label: 'Payments',
      icon: CreditCard,
      badge: 'New',
      badgeColor: 'bg-primary text-primary-foreground',
      onClick: () => handleNotice('Daftar Channel Pembayaran aktif di pengaturan kasir.'),
    },
    {
      id: 'customer',
      label: 'Customer',
      icon: Users,
      onClick: () => handleNotice('Daftar Pelanggan & CRM terintegrasi di panel transaksi.'),
    },
  ]

  // Grup 3: Back Office
  const backOfficeItems: NavItem[] = [
    {
      id: 'reports',
      label: 'Reports',
      icon: BarChart3,
      onClick: () => handleNotice('Laporan Penjualan harian tersedia di Dashboard Admin.'),
    },
    {
      id: 'setting',
      label: 'Setting',
      icon: Settings,
      onClick: () => handleNotice('Pengaturan sistem dapat dikonfigurasi oleh Admin.'),
    },
  ]

  return (
    <aside
      className={cn(
        'relative z-40 flex h-full shrink-0 flex-col border-r border-border/70 bg-card py-3.5 transition-all duration-300 ease-in-out select-none',
        collapsed ? 'w-16 items-center px-2' : 'w-60 px-3.5',
      )}
    >
      {/* ===== Header Brand & Collapse Toggle ===== */}
      <div
        className={cn(
          'flex items-center',
          collapsed ? 'flex-col gap-2 justify-center w-full' : 'justify-between px-1',
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
            <Coffee className="h-4 w-4" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="truncate text-sm font-bold tracking-tight text-foreground leading-tight">
                RestroBit
              </h1>
              <span className="text-[10px] font-semibold text-primary">Point of Sale</span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={toggleCollapse}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          title={collapsed ? 'Buka Sidebar' : 'Tutup Sidebar'}
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>

      {/* ===== User Profile Card (RestroBit Style) ===== */}
      {collapsed ? (
        <div
          className="mt-3.5 flex flex-col items-center"
          title={`${user?.name || 'Kasir'} • ${user?.role === 'ADMIN' ? 'Administrator' : 'Kasir Shift'}`}
        >
          <div className="relative">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary border border-primary/20">
              {user?.name ? initialsOf(user.name) : <User className="h-4 w-4" />}
            </div>
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-card bg-emerald-500" />
          </div>
        </div>
      ) : (
        <div className="mt-3.5 rounded-2xl border border-border/70 bg-secondary/40 p-2.5 shadow-subtle">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary border border-primary/20">
                {user?.name ? initialsOf(user.name) : <User className="h-4 w-4" />}
              </div>
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-card bg-emerald-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-foreground">
                {user?.name || 'Kasir Shift'}
              </p>
              <p className="truncate text-[10px] font-medium text-muted-foreground">
                {user?.role === 'ADMIN' ? 'Administrator' : 'Kasir / Staf'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ===== Navigation Items Section (Scrollable) ===== */}
      <div className="mt-4 flex min-h-0 flex-1 flex-col overflow-y-auto pr-0.5 scrollbar-none space-y-1">
        {/* Grup 1: Main Menu */}
        <div className="space-y-1">
          {mainItems.map((item) => (
            <NavButton key={item.id} item={item} collapsed={collapsed} />
          ))}
        </div>

        {/* Grup 2: Offering */}
        <div className="pt-2">
          {collapsed ? (
            <div className="my-2 h-px w-6 bg-border/60 mx-auto" />
          ) : (
            <p className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
              Offering
            </p>
          )}
          <div className="space-y-1">
            {offeringItems.map((item) => (
              <NavButton key={item.id} item={item} collapsed={collapsed} />
            ))}
          </div>
        </div>

        {/* Grup 3: Back Office */}
        <div className="pt-2">
          {collapsed ? (
            <div className="my-2 h-px w-6 bg-border/60 mx-auto" />
          ) : (
            <p className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
              Back Office
            </p>
          )}
          <div className="space-y-1">
            {backOfficeItems.map((item) => (
              <NavButton key={item.id} item={item} collapsed={collapsed} />
            ))}
          </div>
        </div>
      </div>

      {/* ===== Bottom Action Buttons ===== */}
      <div className="mt-auto pt-3 border-t border-border/70 space-y-1">
        {/* Lock Register */}
        <button
          type="button"
          onClick={onLockRegister}
          className={cn(
            'flex items-center rounded-xl text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-all duration-150 active:scale-[0.98]',
            collapsed ? 'h-9 w-9 justify-center' : 'h-9 w-full gap-3 px-3 justify-start',
          )}
          title={collapsed ? 'Lock Register' : undefined}
        >
          <LockKeyhole className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="truncate">Lock Register</span>}
        </button>

        {/* Logout / Sign Out */}
        <button
          type="button"
          onClick={logout}
          className={cn(
            'flex items-center rounded-xl text-xs font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-150 active:scale-[0.98]',
            collapsed ? 'h-9 w-9 justify-center' : 'h-9 w-full gap-3 px-3 justify-start',
          )}
          title={collapsed ? 'Sign Out / Logout' : undefined}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="truncate">Sign Out</span>}
        </button>
      </div>
    </aside>
  )
}

/** Tombol item navigasi tunggal yang otomatis menyesuaikan saat collapsed vs expanded. */
function NavButton({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const Icon = item.icon
  const isActive = item.active

  return (
    <button
      type="button"
      onClick={item.onClick}
      title={collapsed ? item.label : undefined}
      className={cn(
        'group flex items-center rounded-xl text-xs font-semibold transition-all duration-150 active:scale-[0.98]',
        collapsed ? 'h-10 w-10 justify-center' : 'h-10 w-full justify-between px-3',
        isActive
          ? 'bg-primary text-primary-foreground shadow-xs'
          : 'text-muted-foreground hover:bg-accent hover:text-foreground',
      )}
    >
      <div className={cn('flex items-center', collapsed ? 'justify-center' : 'gap-3 min-w-0')}>
        <Icon
          className={cn(
            'h-4 w-4 shrink-0 transition-colors',
            isActive
              ? 'text-primary-foreground'
              : 'text-muted-foreground group-hover:text-foreground',
          )}
        />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </div>

      {!collapsed && item.badge && (
        <span
          className={cn(
            'ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums',
            item.badgeColor || 'bg-muted text-muted-foreground',
          )}
        >
          {item.badge}
        </span>
      )}
    </button>
  )
}
