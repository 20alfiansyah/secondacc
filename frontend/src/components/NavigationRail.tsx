import { useState } from 'react'
import { Coffee, History, LockKeyhole, LogOut, Store, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'

interface NavigationRailProps {
  /** Buka slide-over drawer riwayat transaksi (Task 1.3.10). */
  onOpenHistory: () => void
  /** Kunci register (kunci sesi kasir saat ini, tanpa logout). */
  onLockRegister: () => void
}

/** Ambil inisial nama (mis. "Siti Aminah" -> "SA") untuk avatar. */
function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('')
}

/**
 * Zone 1 — Slim Left Navigation Rail.
 * Rail kasir ~64px: logo di atas, ikon navigasi (Register aktif + Order History),
 * dan avatar kasir di bawah dengan popover (info login, lock register, sign out).
 */
export default function NavigationRail({ onOpenHistory, onLockRegister }: NavigationRailProps) {
  const { user, logout } = useAuthStore()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <nav className="relative z-40 flex h-full w-16 shrink-0 flex-col items-center border-r border-border/70 bg-card py-4">
      {/* Logo kafe */}
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-xs">
        <Coffee className="h-5 w-5" />
      </div>

      {/* Ikon navigasi */}
      <div className="mt-8 flex flex-col items-center gap-1.5">
        <button
          type="button"
          title="Register / POS"
          className={cn(
            'flex h-11 w-11 items-center justify-center rounded-2xl transition-all duration-150 active:scale-[0.97]',
            'text-white bg-primary shadow-xs',
          )}
        >
          <Store className="h-5 w-5" />
        </button>
        <button
          type="button"
          title="Order History"
          onClick={onOpenHistory}
          className="flex h-11 w-11 items-center justify-center rounded-2xl text-muted-foreground transition-all duration-150 hover:bg-accent hover:text-foreground active:scale-[0.97]"
        >
          <History className="h-5 w-5" />
        </button>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Avatar kasir + popover */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          title={user?.name || 'Kasir'}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-border/80 bg-secondary text-sm font-bold text-foreground transition-all duration-150 hover:bg-accent active:scale-[0.97]"
        >
          {user?.name ? initialsOf(user.name) : <User className="h-4 w-4" />}
        </button>

        {menuOpen && (
          <>
            {/* Klik di luar untuk menutup popover */}
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            <div className="absolute bottom-0 left-full z-50 ml-3 w-60 animate-in fade-in slide-in-from-left-1 duration-150">
              <div className="overflow-hidden rounded-2xl border border-border/70 bg-popover shadow-modal">
                {/* Info login */}
                <div className="flex items-center gap-3 px-3.5 py-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {user?.name ? initialsOf(user.name) : <User className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-foreground">
                      {user?.name || 'Kasir'}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      @{user?.username ?? '-'} • {user?.role ?? '-'}
                    </p>
                  </div>
                </div>

                <div className="mx-3.5 h-px bg-border" />

                <div className="p-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      onLockRegister()
                      setMenuOpen(false)
                    }}
                    className="w-full justify-start px-3 text-muted-foreground"
                  >
                    <LockKeyhole className="h-4 w-4" />
                    Lock Register
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      logout()
                      setMenuOpen(false)
                    }}
                    className="w-full justify-start px-3 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </nav>
  )
}
