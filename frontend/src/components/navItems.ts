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
      { id: 'account', label: 'Account', icon: 'manage_accounts' },
      { id: 'menu', label: 'Menu', icon: 'restaurant_menu' },
      { id: 'payment', label: 'Payment', icon: 'payments' },
      { id: 'target', label: 'Target', icon: 'flag' },
      { id: 'printer', label: 'Printer', icon: 'print' },
      {
        id: 'reports',
        label: 'History',
        icon: 'analytics',
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
