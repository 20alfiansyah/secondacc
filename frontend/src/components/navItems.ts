/**
 * Data menu navigasi bersama (rail desktop + drawer mobile) — murni data,
 * TANPA onClick: komponen pemakai (NavigationRail, MobileNav) memetakan
 * id/notice ke aksinya masing-masing.
 */
export interface NavItemData {
  id: string
  label: string
  icon: string
  /** Pesan "fitur belum tersedia" — komponen memanggil onFeatureNotice dgn ini. */
  notice?: string
}

export interface NavGroupData {
  id: string
  label: string
  items: NavItemData[]
}

export const navGroups: NavGroupData[] = [
  {
    id: 'cashier-ops',
    label: 'Cashier Ops',
    items: [
      { id: 'register', label: 'Register', icon: 'point_of_sale' },
      { id: 'history', label: 'Order History', icon: 'receipt_long' },
    ],
  },
  {
    id: 'management-ops',
    label: 'Management & Ops',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
      {
        id: 'inventory',
        label: 'Inventory',
        icon: 'inventory_2',
        notice: 'Inventory arrives in the stock management phase.',
      },
      {
        id: 'reports',
        label: 'Reports',
        icon: 'analytics',
        notice: 'Daily sales reports are available in the Admin Dashboard.',
      },
      {
        id: 'setting',
        label: 'Settings',
        icon: 'tune',
        notice: 'System settings can be configured by an Admin.',
      },
    ],
  },
]

/** Inisial nama utk avatar (mis. "Nahid Zaman" -> "NZ", "Siti" -> "S"). */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('')
}

/** Label role utk kartu user di footer nav. */
export function roleLabel(role: string): string {
  return role === 'ADMIN' ? 'Administrator' : 'Active Cashier'
}
