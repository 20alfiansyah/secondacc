import { Coffee, LogOut } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function Dashboard() {
  const { user, logout } = useAuthStore()
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md rounded-3xl border border-border/80 bg-card p-6 shadow-card text-center">
        <CardContent className="space-y-4 pt-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Coffee className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Dashboard Admin</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Selamat datang, <span className="font-semibold text-foreground">{user?.name}</span> ({user?.role}).
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Modul analitik & pengaturan akan diimplementasikan pada Fase 2 & Fase 3.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={logout} className="mt-2">
            <LogOut className="h-4 w-4" />
            Keluar
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
