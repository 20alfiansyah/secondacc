import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Role } from '@/api/client'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import Icon from '@/components/ui/Icon'

interface NavigationRailProps {
  /** Open the transaction history slide-over drawer (Task 1.3.10). */
  onOpenHistory: () => void
  /** Lock the register (end current cashier session without logging out). */
  onLockRegister: () => void
  /** Optional callback when a menu that is not available yet is clicked. */
  onFeatureNotice?: (featureName: string) => void
}

/** Get name initials (e.g. "Nahid Zaman" -> "NZ", "Siti" -> "S") for the avatar. */
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
  /** Material Symbols glyph name (rendered via ui/Icon). */
  icon: string
  /** Roles allowed to see this item. The list is filtered per logged-in user. */
  roles: Role[]
  badge?: string
  badgeColor?: string
  active?: boolean
  onClick: () => void
}

interface NavGroup {
  id: string
  label: string
  items: NavItem[]
}

const COLLAPSE_KEY = 'cafe_pos_sidebar_collapsed'

/**
 * Collapsible, role-aware navigation rail (Stitch design: RestroBit POS).
 * Expanded (240px): brand box + LIVE pill, grouped menus ("Cashier Ops" /
 * "Management & Ops"), live clock, user card with lock & sign-out.
 * Collapsed (72px): icons only, centered. State persists in localStorage.
 * A floating pill toggle sits on the rail boundary at vertical center.
 */
export default function NavigationRail({
  onOpenHistory,
  onLockRegister,
  onFeatureNotice,
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

  // Live clock for the rail footer (expanded only)
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
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

  const role = user?.role ?? 'CASHIER'
  const roleLabelText = role === 'ADMIN' ? 'Administrator' : 'Active Cashier'

  // Full menu structure — each item declares which roles may see it.
  // Groups whose items are all filtered out are hidden entirely.
  const groups: NavGroup[] = [
    {
      id: 'cashier-ops',
      label: 'Cashier Ops',
      items: [
        {
          id: 'register',
          label: 'Register',
          icon: 'point_of_sale',
          roles: ['ADMIN', 'CASHIER'],
          active: true,
          onClick: () => navigate('/pos'),
        },
        {
          id: 'history',
          label: 'Order History',
          icon: 'receipt_long',
          roles: ['ADMIN', 'CASHIER'],
          onClick: onOpenHistory,
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
          roles: ['ADMIN'],
          onClick: () => navigate('/dashboard'),
        },
        {
          id: 'table',
          label: 'Tables',
          icon: 'table_restaurant',
          roles: ['ADMIN'],
          onClick: () => handleNotice('Table management arrives in the reservation phase.'),
        },
        {
          id: 'reservations',
          label: 'Reservations',
          icon: 'calendar_month',
          roles: ['ADMIN'],
          onClick: () => handleNotice('Table reservations arrive in a later phase.'),
        },
        {
          id: 'payments',
          label: 'Payments',
          icon: 'credit_card',
          roles: ['ADMIN'],
          badge: 'New',
          badgeColor: 'bg-primary text-primary-foreground',
          onClick: () => handleNotice('Active payment channels live in cashier settings.'),
        },
        {
          id: 'customer',
          label: 'Customers',
          icon: 'group',
          roles: ['ADMIN'],
          onClick: () => handleNotice('Customer list & CRM integrate in the transaction panel.'),
        },
        {
          id: 'reports',
          label: 'Reports',
          icon: 'analytics',
          roles: ['ADMIN'],
          onClick: () => handleNotice('Daily sales reports are available in the Admin Dashboard.'),
        },
        {
          id: 'setting',
          label: 'Settings',
          icon: 'tune',
          roles: ['ADMIN'],
          onClick: () => handleNotice('System settings can be configured by an Admin.'),
        },
      ],
    },
  ]

  const visibleGroups = groups
    .map((g) => ({ ...g, items: g.items.filter((item) => item.roles.includes(role)) }))
    .filter((g) => g.items.length > 0)

  return (
    <aside
      className={cn(
        'relative z-40 flex h-full shrink-0 select-none flex-col border-r border-border/80 bg-card transition-[width] duration-300 ease-in-out',
        collapsed ? 'w-[72px]' : 'w-[240px]',
      )}
    >
      {/* ===== Brand header with logo + LIVE badge ===== */}
      <div
        className={cn(
          'flex h-16 shrink-0 items-center border-b border-border/60',
          collapsed ? 'justify-center px-2' : 'justify-between px-4',
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-800 bg-slate-950 p-1 shadow-sm">
            <img alt="Logo" className="h-full w-full rounded-lg object-contain" src="/favicon.svg" />
          </div>
          {!collapsed && (
            <div className="flex min-w-0 flex-col">
              <span className="truncate font-display text-sm font-bold leading-tight tracking-tight text-foreground">
                2ND ACC
              </span>
              <span className="truncate text-[10px] font-semibold uppercase tracking-wider text-primary">
                Roastery &amp; Coffee
              </span>
            </div>
          )}
        </div>
        {!collapsed && (
          <div
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-live-border bg-live-light px-2 py-0.5 text-primary-dark"
            title="Online POS System"
          >
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-live" />
            <span className="font-display text-[10px] font-bold uppercase tracking-wider">LIVE</span>
          </div>
        )}
      </div>

      {/* ===== Navigation groups (scrollable, filtered by role) ===== */}
      <nav className="flex min-h-0 flex-1 flex-col space-y-1 overflow-y-auto p-3">
        {visibleGroups.map((group, index) => (
          <div key={group.id} className={cn('space-y-1', index > 0 && 'pt-3')}>
            {collapsed ? (
              index > 0 && <div className="mx-auto my-2 h-px w-6 bg-border/70" />
            ) : (
              <p className="px-3 pb-1 pt-1 font-display text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {group.label}
              </p>
            )}
            <div className="space-y-1">
              {group.items.map((item) => (
                <NavButton key={item.id} item={item} collapsed={collapsed} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* ===== Footer: live clock + user card ===== */}
      <div
        className={cn(
          'shrink-0 space-y-2 border-t border-border/60 bg-secondary/50',
          collapsed ? 'flex flex-col items-center p-2 py-3' : 'p-3',
        )}
      >
        {!collapsed && (
          <div className="flex items-center justify-between px-1 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Icon name="schedule" className="text-[14px] text-slate-400" />
              <span className="font-semibold tabular-nums">
                {now.toLocaleTimeString('en-US', { hour12: true })}
              </span>
            </div>
          </div>
        )}

        <div
          className={cn(
            'flex w-full items-center gap-2.5 rounded-xl border border-border/80 bg-card shadow-xs',
            collapsed
              ? 'flex-col justify-center border-0 bg-transparent p-0 shadow-none'
              : 'justify-between p-2',
          )}
          title={collapsed ? `${user?.name || 'Cashier'} • ${roleLabelText}` : undefined}
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary font-display text-xs font-bold text-primary-foreground shadow-xs">
              {user?.name ? initialsOf(user.name) : <Icon name="person" className="text-base" />}
            </div>
            {!collapsed && (
              <div className="min-w-0 leading-tight">
                <p className="truncate text-xs font-semibold tracking-tight text-foreground">
                  {user?.name || 'Cashier'}
                </p>
                <p className="truncate text-[10px] font-medium tracking-wide text-primary">
                  {roleLabelText}
                </p>
              </div>
            )}
          </div>
          {!collapsed && (
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={onLockRegister}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-accent hover:text-foreground"
                title="Lock Register"
              >
                <Icon name="lock" className="text-[17px]" />
              </button>
              <button
                type="button"
                onClick={logout}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-destructive/10 hover:text-destructive"
                title="Sign Out"
              >
                <Icon name="logout" className="text-[17px]" />
              </button>
            </div>
          )}
        </div>

        {collapsed && (
          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              onClick={onLockRegister}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-accent hover:text-foreground"
              title="Lock Register"
            >
              <Icon name="lock" className="text-[18px]" />
            </button>
            <button
              type="button"
              onClick={logout}
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
        className="group absolute -right-3 top-1/2 z-50 flex h-12 w-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-border bg-card shadow-md transition-all hover:bg-secondary"
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <Icon
          name={collapsed ? 'chevron_right' : 'chevron_left'}
          className="text-[16px] text-muted-foreground transition-transform group-hover:scale-110"
        />
      </button>
    </aside>
  )
}

/**
 * Single navigation button. Active state = solid Bismark fill with a live
 * green dot badge (per Stitch design); inactive rows stay quiet gray.
 */
function NavButton({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const isActive = item.active

  return (
    <button
      type="button"
      onClick={item.onClick}
      title={collapsed ? item.label : undefined}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'group flex items-center rounded-xl text-xs transition-all duration-150 active:scale-[0.98]',
        collapsed ? 'h-10 w-full justify-center' : 'h-10 w-full justify-between px-3',
        isActive
          ? 'bg-primary font-semibold text-primary-foreground shadow-sm'
          : 'font-medium text-slate-600 hover:bg-accent hover:text-foreground',
      )}
    >
      <div className={cn('flex items-center', collapsed ? 'justify-center' : 'min-w-0 gap-2.5')}>
        <Icon
          name={item.icon}
          className={cn(
            'text-[19px]',
            isActive ? 'text-primary-foreground' : 'text-slate-400 group-hover:text-primary',
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
      {!collapsed && isActive && !item.badge && (
        <span className="h-2 w-2 shrink-0 rounded-full bg-live shadow-xs" aria-hidden="true" />
      )}
    </button>
  )
}
