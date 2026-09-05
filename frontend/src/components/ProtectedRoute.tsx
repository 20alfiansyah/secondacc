import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

interface ProtectedRouteProps {
  /** Role yang diizinkan mengakses route. Kosong = semua role yang sudah login. */
  roles?: string[]
  children: ReactNode
}

/** Pembatas route: wajib login; opsional batasi role tertentu. */
export default function ProtectedRoute({ roles, children }: ProtectedRouteProps) {
  const { token, user } = useAuthStore()

  if (!token || !user) {
    return <Navigate to="/login" replace />
  }

  if (roles && roles.length > 0 && !roles.includes(user.role)) {
    return <Navigate to={user.role === 'ADMIN' ? '/dashboard' : '/pos'} replace />
  }

  return <>{children}</>
}
