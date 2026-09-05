import { useAuthStore } from '@/store/authStore'

export default function POS() {
  const { user, logout } = useAuthStore()
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-4">
      <h1 className="text-2xl font-semibold">Layar Kasir POS</h1>
      <p className="text-muted-foreground">
        Selamat datang, {user?.name}. Halaman POS akan diisi pada Task 1.3.3.
      </p>
      <button onClick={logout} className="text-sm text-muted-foreground underline">
        Keluar
      </button>
    </div>
  )
}
