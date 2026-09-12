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
import type { Role } from '@/api/client'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'

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
  icon: LucideIcon
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

/** Human-readable role label for the profile card. */
function roleLabel(role: Role | undefined): string {
  return role === 'ADMIN' ? 'Administrator' : 'Cashier'
}

const COLLAPSE_KEY = 'cafe_pos_sidebar_collapsed'

/**
 * Collapsible, role-aware navigation rail.
 * Expanded (~240px): icon + label, profile card, grouped menus.
 * Collapsed (~72px): icons only. State persists in localStorage and the width
 * transitions smoothly. CASHIER users only see Register (POS) and Order
 * History; the remaining menus are reserved for ADMIN (Phase 2+).
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

  // Full menu structure — each item declares which roles may see it.
  // Groups whose items are all filtered out are hidden entirely.
  const groups: NavGroup[] = [
    {
      id: 'pos',
      label: 'POS',
      items: [
        {
          id: 'register',
          label: 'Register',
          icon: Store,
          roles: ['ADMIN', 'CASHIER'],
          active: true,
          onClick: () => navigate('/pos'),
        },
        {
          id: 'history',
          label: 'Order History',
          icon: History,
          roles: ['ADMIN', 'CASHIER'],
          onClick: onOpenHistory,
        },
      ],
    },
    {
      id: 'management',
      label: 'Management',
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: LayoutDashboard,
          roles: ['ADMIN'],
          onClick: () => navigate('/dashboard'),
        },
        {
          id: 'table',
          label: 'Tables',
          icon: UtensilsCrossed,
          roles: ['ADMIN'],
          onClick: () => handleNotice('Table management arrives in the reservation phase.'),
        },
        {
          id: 'reservations',
          label: 'Reservations',
          icon: CalendarClock,
          roles: ['ADMIN'],
          onClick: () => handleNotice('Table reservations arrive in a later phase.'),
        },
        {
          id: 'payments',
          label: 'Payments',
          icon: CreditCard,
          roles: ['ADMIN'],
          badge: 'New',
          badgeColor: 'bg-primary text-primary-foreground',
          onClick: () => handleNotice('Active payment channels live in cashier settings.'),
        },
        {
          id: 'customer',
          label: 'Customers',
          icon: Users,
          roles: ['ADMIN'],
          onClick: () => handleNotice('Customer list & CRM integrate in the transaction panel.'),
        },
      ],
    },
    {
      id: 'backoffice',
      label: 'Back Office',
      items: [
        {
          id: 'reports',
          label: 'Reports',
          icon: BarChart3,
          roles: ['ADMIN'],
          onClick: () => handleNotice('Daily sales reports are available in the Admin Dashboard.'),
        },
        {
          id: 'setting',
          label: 'Settings',
          icon: Settings,
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
        'relative z-40 flex h-full shrink-0 flex-col border-r border-border/70 bg-card py-3.5 transition-[width] duration-300 ease-in-out select-none',
        collapsed ? 'w-[72px] items-center px-2.5' : 'w-60 px-3.5',
      )}
    >
      {/* ===== Brand & collapse toggle ===== */}
      <div
        className={cn(
          'flex items-center',
          collapsed ? 'w-full flex-col justify-center gap-2' : 'justify-between px-1',
        )}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
            <Coffee className="h-4 w-4" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="truncate text-sm font-bold leading-tight tracking-tight text-foreground">
                RestroBit
              </h1>
              <span className="text-[10px] font-semibold text-primary">Point of Sale</span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={toggleCollapse}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>

      {/* ===== User profile (avatar + name + role when expanded) ===== */}
      {collapsed ? (
        <div
          className="mt-3.5 flex flex-col items-center"
          title={`${user?.name || 'Cashier'} • ${roleLabel(user?.role)}`}
        >
          <div className="relative">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-xs font-bold text-primary">
              {user?.name ? initialsOf(user.name) : <User className="h-4 w-4" />}
            </div>
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-card bg-emerald-500" />
          </div>
        </div>
      ) : (
        <div className="mt-3.5 rounded-2xl border border-border/70 bg-secondary/40 p-2.5 shadow-subtle">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-xs font-bold text-primary">
                {user?.name ? initialsOf(user.name) : <User className="h-4 w-4" />}
              </div>
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-card bg-emerald-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-foreground">
                {user?.name || 'Cashier'}
              </p>
              <p className="truncate text-[10px] font-medium text-muted-foreground">
                {roleLabel(user?.role)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ===== Navigation groups (scrollable, filtered by role) ===== */}
      <div className="scrollbar-none mt-4 flex min-h-0 flex-1 flex-col space-y-1 overflow-y-auto pr-0.5">
        {visibleGroups.map((group, index) => (
          <div key={group.id} className={cn(index > 0 && 'pt-2')}>
            {collapsed ? (
              index > 0 && <div className="mx-auto my-2 h-px w-6 bg-border/60" />
            ) : (
              <p
                className={cn(
                  'px-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70',
                  index > 0 && 'pt-2',
                )}
              >
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
      </div>

      {/* ===== Bottom actions ===== */}
      <div className="mt-auto space-y-1 border-t border-border/70 pt-3">
        {!collapsed && (
          <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
            Account
          </p>
        )}
        <button
          type="button"
          onClick={onLockRegister}
          className={cn(
            'flex items-center rounded-xl text-xs font-medium text-muted-foreground transition-all duration-150 hover:bg-accent hover:text-foreground active:scale-[0.98]',
            collapsed ? 'h-9 w-full justify-center' : 'h-9 w-full justify-start gap-3 px-3',
          )}
          title={collapsed ? 'Lock Register' : undefined}
        >
          <LockKeyhole className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="truncate">Lock Register</span>}
        </button>

        <button
          type="button"
          onClick={logout}
          className={cn(
            'flex items-center rounded-xl text-xs font-medium text-muted-foreground transition-all duration-150 hover:bg-destructive/10 hover:text-destructive active:scale-[0.98]',
            collapsed ? 'h-9 w-full justify-center' : 'h-9 w-full justify-start gap-3 px-3',
          )}
          title={collapsed ? 'Sign Out' : undefined}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="truncate">Sign Out</span>}
        </button>
      </div>
    </aside>
  )
}

/** Single navigation button; adapts to collapsed vs expanded and uses a soft-gray row fill when active. */
function NavButton({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const Icon = item.icon
  const isActive = item.active

  return (
    <button
      type="button"
      onClick={item.onClick}
      title={collapsed ? item.label : undefined}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'group flex items-center rounded-xl text-xs font-semibold transition-all duration-150 active:scale-[0.98]',
        collapsed ? 'h-10 w-full justify-center' : 'h-10 w-full justify-between px-3',
        isActive
          ? 'bg-accent text-foreground'
          : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
      )}
    >
      <div className={cn('flex items-center', collapsed ? 'justify-center' : 'min-w-0 gap-3')}>
        <Icon
          className={cn(
            'h-4 w-4 shrink-0 transition-colors',
            isActive
              ? 'text-primary'
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
