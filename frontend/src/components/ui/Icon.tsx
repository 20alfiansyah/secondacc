import type { ComponentType } from 'react'
import {
  Archive,
  ArchiveRestore,
  Banknote,
  Calendar,
  Cake,
  Calculator,
  ChartColumn,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleAlert,
  CircleCheck,
  CloudCheck,
  Clock,
  Cookie,
  Coffee,
  CreditCard,
  Croissant,
  CupSoda,
  Flame,
<<<<<<< HEAD
  Info,
  KeyRound,
=======
>>>>>>> main
  LayoutDashboard,
  Lock,
  LogOut,
  Menu,
  Package,
  PenLine,
  Pencil,
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
<<<<<<< HEAD
  Tags,
=======
>>>>>>> main
  Trash2,
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
 */
const MAP: Record<string, ComponentType<{ className?: string; strokeWidth?: number }>> = {
  add: Plus,
  archive: Archive,
  category: Tags,
  delete: Trash2,
  add_shopping_cart: ShoppingCart,
  analytics: ChartColumn,
  bolt: Zap,
  calendar: Calendar,
  check_circle: CircleCheck,
  chevron_left: ChevronLeft,
  chevron_right: ChevronRight,
  clock: Clock,
  close: X,
  cloud_done: CloudCheck,
  coffee: Coffee,
  credit_card: CreditCard,
  dashboard: LayoutDashboard,
  edit: Pencil,
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
  trash: Trash2,
  tune: SlidersHorizontal,
<<<<<<< HEAD
  username: User,
  restore: ArchiveRestore,
=======
>>>>>>> main
}

export default function Icon({
  name,
  className,
}: {
  name: string
  className?: string
}) {
  const Cmp = MAP[name] ?? CircleAlert
  return (
    <Cmp
      aria-hidden="true"
      className={cn('icon-inline shrink-0', className)}
      strokeWidth={2}
    />
  )
}
