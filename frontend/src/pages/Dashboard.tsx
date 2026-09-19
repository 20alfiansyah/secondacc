import { useAuthStore } from '@/store/authStore'
import Icon from '@/components/ui/Icon'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function Dashboard() {
  const { user, logout } = useAuthStore()
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-6">
      <Card className="w-full max-w-md rounded-3xl border border-border/80 bg-card p-6 shadow-card text-center">
        <CardContent className="space-y-4 pt-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Icon name="coffee" className="text-3xl" />
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
            <Icon name="logout" className="text-base" />
            Keluar
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
