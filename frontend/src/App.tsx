import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import ProtectedRoute from '@/components/ProtectedRoute'
import Login from '@/pages/Login'
import POS from '@/pages/POS'
import Dashboard from '@/pages/Dashboard'

// Data router (bukan BrowserRouter) agar useBlocker tersedia di POS —
// dipakai untuk memblokir navigasi route saat ada perubahan belum disimpan.
const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  {
    path: '/pos',
    element: (
      <ProtectedRoute roles={['CASHIER']}>
        <POS />
      </ProtectedRoute>
    ),
  },
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute roles={['ADMIN']}>
        <Dashboard />
      </ProtectedRoute>
    ),
  },
  { path: '*', element: <Login /> },
])

export default function App() {
  return <RouterProvider router={router} />
}
