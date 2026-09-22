import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import Icon from '@/components/ui/Icon'
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
function homePathForRole(role: string): string {
  if (role === 'ADMIN') return '/dashboard'
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
      setError('Invalid username or password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-svh items-center justify-center bg-background p-4 overflow-hidden">
      {/* Subtle ambient gradient mesh */}
      <div className="pointer-events-none absolute -top-40 -right-40 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />

      <Card className="relative w-full max-w-sm rounded-3xl border border-border/80 bg-card p-2 shadow-card transition-all">
        <CardHeader className="space-y-2 text-center pb-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-xs">
            <Icon name="local_cafe" className="text-3xl" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl font-extrabold tracking-tight text-foreground">
              Cafe POS
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Sistem kasir dan manajemen transaksi modern
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="px-6 pb-6 pt-2">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="username" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Username
              </label>
              <Input
                id="username"
                name="username"
                autoComplete="username"
                placeholder="Enter cashier username..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="h-11 bg-background"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
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
                className="h-11 bg-background"
              />
            </div>

            {error && (
              <p role="alert" className="rounded-xl bg-destructive/10 px-3.5 py-2.5 text-xs font-semibold text-destructive">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full h-11 text-sm font-bold shadow-sm" disabled={loading}>
              {loading ? 'Verifying...' : 'Sign in to POS'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
