import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { initials, navGroups, roleLabel } from '@/components/navItems'
import type { NavItemData } from '@/components/navItems'
import Icon from '@/components/ui/Icon'

interface NavigationRailProps {
  /** Open the transaction history slide-over drawer (Task 1.3.10). */
  onOpenHistory: () => void
  /** Lock the register (end current cashier session without logging out). */
  onLockRegister: () => void
  /** Optional callback when a menu that is not available yet is clicked. */
  onFeatureNotice?: (featureName: string) => void
  /** Halaman aktif utk penandaan rail (opsional). */
  page?: string
  /** Optional sign-out override — POS wraps it with the unsaved-changes guard. */
  onSignOut?: () => void
  /** Kelas tambahan di root <aside> (mis. `hidden lg:flex` agar rail
   *  desktop-only; mobile memakai MobileNav). */
  className?: string
}

type NavItem = NavItemData & { active?: boolean; onClick: () => void }


const COLLAPSE_KEY = 'cafe_pos_sidebar_collapsed'
export const SIDEBAR_TOGGLE_EVENT = 'cafe_pos:toggle-sidebar'

/**
 * Collapsible left sidebar (Stitch screen1 markup 1:1): brand header, nav
 * Cashier Ops / Management & Ops, footer shift row + user card,
 * floating center toggle. Collapsed state = w-[4.5rem] dengan label tersembunyi.
 */
export default function NavigationRail({
  onOpenHistory,
  onLockRegister,
  onFeatureNotice,
  page,
  onSignOut,
  className,
}: NavigationRailProps) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  // Collapsed state persisted in localStorage
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === 'true'
    } catch {
      return false
    }
  })

  // Alt+S dari POS men-trigger event ini untuk collapse/expand sidebar.
  useEffect(() => {
    function onToggle() {
      setCollapsed((prev) => {
        const next = !prev
        try {
          localStorage.setItem(COLLAPSE_KEY, String(next))
        } catch {
          // ignore
        }
        return next
      })
    }
    window.addEventListener(SIDEBAR_TOGGLE_EVENT, onToggle)
    return () => window.removeEventListener(SIDEBAR_TOGGLE_EVENT, onToggle)
  }, [])

  function toggleCollapse() {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(COLLAPSE_KEY, String(next))
      } catch {
        // ignore
      }
      return next
    })
  }

  function handleNotice(name: string) {
    onFeatureNotice?.(name)
  }
  // Menu structure 1:1 dengan Stitch screen1 (role gating di route level,
  // bukan di nav — sesuai desain).
  const groups = navGroups.map((group) => ({
    ...group,
    items: group.items.map((item) => ({
      ...item,
      active:
        (item.id === 'register' && page === 'Register') ||
        (item.id === 'dashboard' && page === 'Dashboard') ||
        (item.id === 'account' && page === 'Account') ||
        (item.id === 'menu' && page === 'Menu') ||
        (item.id === 'payment' && page === 'Payment') ||
        (item.id === 'target' && page === 'Target') ||
        (item.id === 'reports' && page === 'History'),
      onClick: () => {
        if (item.notice) {
          handleNotice(item.notice)
        } else if (item.id === 'register') {
          navigate('/pos')
        } else if (item.id === 'history') {
          onOpenHistory()
        } else if (item.id === 'dashboard') {
          navigate('/dashboard')
        } else if (item.id === 'account') {
          navigate('/dashboard/account')
        } else if (item.id === 'menu') {
          navigate('/dashboard/menu')
        } else if (item.id === 'payment') {
          navigate('/dashboard/payment')
        } else if (item.id === 'target') {
          navigate('/dashboard/target')
        } else if (item.id === 'reports') {
          navigate('/dashboard/history')
        }
      },
    })),
  }))
  // Fase 2.5: kasir hanya melihat grup cashier-ops; ADMIN melihat semuanya.
  const role = user?.role ?? 'CASHIER'
  const roleLabelText = roleLabel(role)
  const visibleGroups = role === 'ADMIN' ? groups : groups.filter((g) => g.id === 'cashier-ops')

  return (
    <aside
      className={cn(
        'relative z-30 flex h-full shrink-0 select-none flex-col justify-between border-r border-slate-200/80 bg-white transition-all duration-300 ease-in-out',
        collapsed ? 'w-[4.5rem]' : 'w-[240px]',
        className,
      )}
    >
      <div className="flex flex-col">

      {/* ===== Brand header with logo ===== */}
      <div
        className={cn(
          'flex h-16 shrink-0 items-center justify-between border-b border-slate-100',
          collapsed ? 'justify-center px-2' : 'px-4',
        )}
      >
        <div className="flex min-w-0 items-center gap-3 overflow-hidden">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-800 bg-slate-950 p-1 shadow-sm">
            <img alt="2ND ACC Logo" className="h-full w-full rounded-lg object-contain" src="/favicon.svg" />
          </div>
          {!collapsed && (
            <div className="flex min-w-0 flex-col">
              <span className="truncate font-display text-sm font-bold leading-tight tracking-tight text-slate-900">
                2ND ACC
              </span>
              <span className="truncate text-[10px] font-semibold uppercase tracking-wider text-[#447C84]">
                Roastery &amp; Coffee
              </span>
            </div>
          )}
        </div>
      </div>

      <nav className="space-y-1 p-3">
        {visibleGroups.map((group, index) => (
          <div key={group.id} className={cn('space-y-1', index > 0 && 'pt-3')}>
            {collapsed ? (
              index > 0 && <div className="mx-auto my-2 h-px w-6 bg-slate-200/80" />
            ) : (
              <div className="px-3 pb-1 pt-1">
                <span className="font-display text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {group.label}
                </span>
              </div>
            )}
            <div className="space-y-1">
              {group.items.map((item) => (
                <NavButton key={item.id} item={item} collapsed={collapsed} />
              ))}
            </div>
          </div>
        ))}
      </nav>
      </div>

      {/* ===== Footer: shift row + user card ===== */}
      <div
        className={cn(
          'shrink-0 space-y-2 border-t border-slate-100 bg-slate-50/70',
          collapsed ? 'flex flex-col items-center p-2 py-3' : 'space-y-2 p-3',
        )}
      >
        {!collapsed && (
          <div className="flex items-center justify-between px-1 text-[11px] text-slate-500">
            <div className="flex items-center gap-1.5">
              <Icon name="schedule" className="text-[14px] text-slate-400" />
              <LiveClock />
            </div>
            <span
              className="rounded-md border border-[#b9e2d3] bg-[#edf7f3] px-2 py-0.5 font-display text-[10px] font-semibold text-[#2d5258]"
              title="Current shift"
            >
              Shift 1
            </span>
          </div>
        )}

        <div
          className={cn(
            'flex w-full items-center gap-2.5 rounded-xl border border-slate-200/80 bg-white p-2 shadow-xs',
            collapsed && 'flex-col justify-center border-0 bg-transparent p-0 shadow-none',
          )}
          title={collapsed ? `${user?.name || 'Cashier'} • ${roleLabelText}` : undefined}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#447C84] font-display text-xs font-bold text-white shadow-xs">
            {user?.name ? initials(user.name) : <Icon name="person" className="text-base" />}
          </div>
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1 leading-tight">
                <p className="truncate text-xs font-semibold tracking-tight text-slate-900">
                  {user?.name || 'Cashier'}
                </p>
                <p className="truncate text-[10px] font-medium tracking-wide text-[#447C84]">
                  {roleLabelText}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={onLockRegister}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-800"
                  title="Lock Terminal"
                >
                  <Icon name="lock" className="text-[17px]" />
                </button>
                <button
                  type="button"
                  onClick={onSignOut ?? logout}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-destructive/10 hover:text-destructive"
                  title="Sign Out"
                >
                  <Icon name="logout" className="text-[17px]" />
                </button>
              </div>
            </>
          )}
        </div>

        {collapsed && (
          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              onClick={onLockRegister}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-800"
              title="Lock Terminal"
            >
              <Icon name="lock" className="text-[18px]" />
            </button>
            <button
              onClick={onSignOut ?? logout}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-destructive/10 hover:text-destructive"
              title="Sign Out"
            >
              <Icon name="logout" className="text-[18px]" />
            </button>
          </div>
        )}
      </div>

      {/* ===== Floating toggle on the rail boundary ===== */}
      <button
        type="button"
        onClick={toggleCollapse}
        className="group absolute -right-3 top-1/2 z-40 flex h-12 w-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white shadow-md transition-all hover:bg-slate-50 hover:text-[#447C84]"
        title="Toggle Sidebar"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <Icon
          name={collapsed ? 'chevron_right' : 'chevron_left'}
          className="text-[16px] text-slate-500 transition-transform group-hover:scale-110"
        />
      </button>
    </aside>
  )
}

/**
 * Single navigation link (Stitch spec): active = solid Bismark fill + green
 * dot badge; inactive rows quiet gray with teal icon on hover.
 */
function NavButton({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const isActive = item.active

  return (
    <button
      type="button"
      onClick={item.onClick}
      title={item.label}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'group flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs transition duration-150 active:scale-[0.98]',
        collapsed && 'justify-center px-0',
        isActive
          ? 'bg-[#447C84] font-semibold text-white shadow-sm'
          : 'font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900',
      )}
    >
      <div className={cn('flex min-w-0 items-center gap-2.5', collapsed && 'justify-center')}>
        <Icon
          name={item.icon}
          className={cn(
            'shrink-0 text-[19px]',
            isActive ? 'text-white' : 'text-slate-400 group-hover:text-[#447C84]',
          )}
        />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </div>

      {!collapsed && isActive && (
        <span className="h-2 w-2 shrink-0 rounded-full bg-[#65AF92] shadow-xs" aria-hidden="true" />
      )}
    </button>
  )
}

/**
 * Jam live footer rail (expanded only) — interval 1 dtk hidup di subkomponen
 * ini, jadi tick per detik hanya me-render ulang jam, bukan seluruh rail.
 */
function LiveClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])
  return (
    <span className="font-semibold tabular-nums">
      {now.toLocaleTimeString('en-US', { hour12: true })}
    </span>
  )
}

