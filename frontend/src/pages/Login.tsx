import { useState, type FormEvent } from 'react'
import { CupSoda } from 'lucide-react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useAuthStore } from '@/store/authStore'

/** Path tujuan setelah login berdasarkan role. */
export function homePathForRole(role: string): string {
  if (role === 'ADMIN' || role === 'INVENTORY') return '/dashboard'
  return '/pos'
}

export default function Login() {
  const navigate = useNavigate()
  const { token, user, login } = useAuthStore()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Sudah login -> arahkan langsung ke halaman sesuai role (Kasir -> /pos, Admin -> /dashboard).
  if (token && user) {
    return <Navigate to={homePathForRole(user.role)} replace />
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const authenticated = await login(username, password)
      navigate(homePathForRole(authenticated.role), { replace: true })
    } catch {
      setError('Username atau password salah. Silakan coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <CupSoda className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl">Cafe POS</CardTitle>
          <CardDescription>Masuk untuk mengelola kasir & penjualan</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium">
                Username
              </label>
              <Input
                id="username"
                name="username"
                autoComplete="username"
                placeholder="kasir1"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Memproses…' : 'Masuk'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
