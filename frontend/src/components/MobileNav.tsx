import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import Icon from '@/components/ui/Icon'

interface MobileNavProps {
  /** Halaman aktif utk breadcrumb (mis. "Register"). */
  page: string
  /** Buka Order History drawer (sama dengan item rail desktop). */
  onOpenHistory: () => void
  /** Lock register (sama dengan rail desktop). */
  onLockRegister: () => void
  /** Notifikasi fitur belum tersedia (Inventory/Reports/Settings). */
  onFeatureNotice?: (featureName: string) => void
  /** Sign out — POS membungkusnya dengan guard perubahan belum disimpan. */
  onSignOut?: () => void
}

interface NavItem {
  id: string
  label: string
  icon: string
  active?: boolean
  onClick: () => void
}

interface NavGroup {
  id: string
  label: string
  items: NavItem[]
}

export default function MobileNav({
  page,
  onOpenHistory,
  onLockRegister,
  onFeatureNotice,
  onSignOut,
}: MobileNavProps) {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const role = user?.role ?? 'CASHIER'
  const roleLabelText = role === 'ADMIN' ? 'Administrator' : 'Active Cashier'
  const initials = (user?.name ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('')

  // Kunci scroll body saat drawer terbuka agar halaman di belakang tidak ikut
  // bergulir dari sentuhan (POS memakai h-svh, tapi konten drawer bisa panjang).
  useEffect(() => {
    if (!menuOpen) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  const groups: NavGroup[] = [
    {
      id: 'cashier-ops',
      label: 'Cashier Ops',
      items: [
        { id: 'register', label: 'Register', icon: 'point_of_sale', active: page === 'Register', onClick: () => setMenuOpen(false) },
        {
          id: 'history',
          label: 'Order History',
          icon: 'receipt_long',
          onClick: () => {
            setMenuOpen(false)
            onOpenHistory()
          },
        },
      ],
    },
    {
      id: 'management-ops',
      label: 'Management & Ops',
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: 'dashboard',
          active: page === 'Dashboard',
          onClick: () => {
            setMenuOpen(false)
            navigate('/dashboard')
          },
        },
        {
          id: 'account',
          label: 'Account',
          icon: 'manage_accounts',
          active: page === 'Account',
          onClick: () => {
            setMenuOpen(false)
            navigate('/dashboard/account')
          },
        },
        {
          id: 'menu',
          label: 'Menu',
          icon: 'restaurant_menu',
          active: page === 'Menu',
          onClick: () => {
            setMenuOpen(false)
            navigate('/dashboard/menu')
          },
        },
        {
          id: 'payment',
          label: 'Payment',
          icon: 'payments',
          active: page === 'Payment',
          onClick: () => {
            setMenuOpen(false)
            navigate('/dashboard/payment')
          },
        },
        {
          id: 'inventory',
          label: 'Inventory',
          icon: 'inventory_2',
          onClick: () => {
            setMenuOpen(false)
            onFeatureNotice?.('Inventory arrives in the stock management phase.')
          },
        },
        {
          id: 'reports',
          label: 'Reports',
          icon: 'analytics',
          onClick: () => {
            setMenuOpen(false)
            onFeatureNotice?.('Daily sales reports are available in the Admin Dashboard.')
          },
        },
        {
          id: 'setting',
          label: 'Settings',
          icon: 'tune',
          onClick: () => {
            setMenuOpen(false)
            onFeatureNotice?.('System settings can be configured by an Admin.')
          },
        },
      ],
    },
  ]

  function handleSignOut() {
    setMenuOpen(false)
    onSignOut?.()
  }

  function handleLockRegister() {
    setMenuOpen(false)
    onLockRegister()
  }

  return (
    <header className="sticky top-0 z-40 flex h-14 w-full flex-shrink-0 items-center justify-between border-b border-slate-200/80 bg-white px-3 shadow-xs lg:hidden">
      {/* Kiri: hamburger */}
      <button
        type="button"
        onClick={() => setMenuOpen(true)}
        aria-label="Open navigation menu"
        aria-expanded={menuOpen}
        className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-xs transition active:scale-95 hover:bg-slate-50 hover:text-slate-900"
      >
        <Icon name="menu" className="text-[20px]" />
      </button>

      {/* Tengah: brand */}
      <div className="flex min-w-0 items-center gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-slate-950 p-0.5">
          <img alt="2ND ACC Logo" className="h-full w-full rounded-md object-contain" src="/favicon.svg" />
        </div>
        <span className="truncate font-display text-sm font-bold tracking-tight text-slate-900">
          2ND ACC
        </span>
      </div>

      {/* Kanan: ringkas — avatar kasir (status, display-only) */}
      <div
        className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#447C84] font-display text-xs font-bold text-white shadow-xs"
        title={user?.name || 'Cashier'}
      >
        {initials || <Icon name="person" className="text-base" />}
      </div>

      {/* Drawer navigasi (slide dari kiri) */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] animate-in fade-in duration-200"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            className="absolute inset-y-0 left-0 flex w-[270px] max-w-[85vw] flex-col justify-between border-r border-slate-200/80 bg-white shadow-modal animate-in slide-in-from-left duration-200"
          >
            {/* Header drawer: brand (tutup via tap backdrop) */}
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-100 px-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-800 bg-slate-950 p-1 shadow-sm">
                  <img alt="2ND ACC Logo" className="h-full w-full rounded-lg object-contain" src="/favicon.svg" />
                </div>
                <div className="flex min-w-0 flex-col">
                  <span className="truncate font-display text-sm font-bold leading-tight tracking-tight text-slate-900">
                    2ND ACC
                  </span>
                  <span className="truncate text-[10px] font-semibold uppercase tracking-wider text-[#447C84]">
                    Roastery &amp; Coffee
                  </span>
                </div>
              </div>
            </div>

            {/* Grup menu 1:1 dengan rail desktop */}
            <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3">
              {groups.map((group, index) => (
                <div key={group.id} className={cn('space-y-1', index > 0 && 'pt-3')}>
                  <div className="px-3 pb-1 pt-1">
                    <span className="font-display text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {group.label}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {group.items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={item.onClick}
                        className={cn(
                          'flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left font-display text-xs transition',
                          item.active
                            ? 'bg-[#447C84] font-bold text-white shadow-sm'
                            : 'font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                        )}
                      >
                        <Icon
                          name={item.icon}
                          className={cn('text-[18px]', item.active ? 'text-white' : 'text-[#447C84]')}
                        />
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </nav>

            {/* Footer: jam + kartu user + lock/signout */}
            <div className="shrink-0 space-y-2 border-t border-slate-100 bg-slate-50/70 p-3">
              <div className="flex items-center gap-2.5 rounded-xl border border-slate-200/80 bg-white p-2 shadow-xs">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#447C84] font-display text-xs font-bold text-white shadow-xs">
                  {user?.name ? initials : <Icon name="person" className="text-base" />}
                </div>
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="truncate text-xs font-semibold tracking-tight text-slate-900">
                    {user?.name || 'Cashier'}
                  </p>
                  <p className="truncate text-[10px] font-medium tracking-wide text-[#447C84]">{roleLabelText}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={handleLockRegister}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-800"
                    title="Lock Terminal"
                  >
                    <Icon name="lock" className="text-[18px]" />
                  </button>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-destructive/10 hover:text-destructive"
                    title="Sign Out"
                  >
                    <Icon name="logout" className="text-[18px]" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
