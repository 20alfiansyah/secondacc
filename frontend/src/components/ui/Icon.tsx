import type { ComponentType } from 'react'
import {
  Banknote,
  Cake,
  Calculator,
  ChartColumn,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleAlert,
  CircleCheck,
  Clock,
  CloudCheck,
  Coffee,
  Cookie,
  CreditCard,
  Croissant,
  CupSoda,
  Flame,
  KeyRound,
  Info,
  LayoutDashboard,
  Lock,
  LogOut,
  Menu,
  Package,
  PenLine,
  Plus,
  Power,
  Printer,
  QrCode,
  Receipt,
  ReceiptText,
  RefreshCw,
  Search,
  ShoppingBag,
  ShoppingCart,
  SlidersHorizontal,
  Star,
  Store,
  Utensils,
  UtensilsCrossed,
  User,
  UserCog,
  UserPlus,
  X,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Icon — wrapper lucide-react (stroke SVG, styling Tailwind-friendly).
 * Pemakaian: <Icon name="point_of_sale" className="text-[19px]" />
 *
 * Ukuran ikon mengikuti font-size lewat `.icon-inline` (width/height: 1em),
 * warna mengikuti `currentColor` — jadi call site lama (text-lg, text-[20px],
 * text-[#447C84], dst.) tidak perlu diubah.
 *
 * `filled` dipertahankan demi kompatibilitas API (stroke-width lebih tebal).
 */
const MAP: Record<string, ComponentType<{ className?: string; strokeWidth?: number }>> = {
  add: Plus,
  add_shopping_cart: ShoppingCart,
  analytics: ChartColumn,
  bolt: Zap,
  check_circle: CircleCheck,
  chevron_down: ChevronDown,
  chevron_left: ChevronLeft,
  chevron_right: ChevronRight,
  chevron_up: ChevronUp,
  close: X,
  cloud_done: CloudCheck,
  coffee: Coffee,
  credit_card: CreditCard,
  dashboard: LayoutDashboard,
  edit_note: PenLine,
  error: CircleAlert,
  expand_less: ChevronUp,
  expand_more: ChevronDown,
  inventory_2: Package,
  info: Info,
  local_cafe: Coffee,
  local_fire_department: Flame,
  lock: Lock,
  logout: LogOut,
  manage_accounts: UserCog,
  menu: Menu,
  password: KeyRound,
  payments: Banknote,
  person: User,
  person_add: UserPlus,
  point_of_sale: Calculator,
  power_settings_new: Power,
  print: Printer,
  qr_code_2: QrCode,
  receipt: Receipt,
  receipt_long: ReceiptText,
  restaurant: Utensils,
  restaurant_menu: UtensilsCrossed,
  bakery_dining: Croissant,
  cake: Cake,
  cookie: Cookie,
  emoji_food_beverage: CupSoda,
  schedule: Clock,
  search: Search,
  shopping_bag: ShoppingBag,
  star: Star,
  storefront: Store,
  sync: RefreshCw,
  takeout_dining: ShoppingBag,
  tune: SlidersHorizontal,
  username: User,
}

export default function Icon({
  name,
  className,
  filled = false,
}: {
  name: string
  className?: string
  filled?: boolean
}) {
  const Cmp = MAP[name] ?? CircleAlert
  return (
    <Cmp
      aria-hidden="true"
      className={cn('icon-inline shrink-0', className)}
      strokeWidth={filled ? 2.5 : 2}
    />
  )
}
