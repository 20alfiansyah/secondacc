import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import ProtectedRoute from '@/components/ProtectedRoute'
import Login from '@/pages/Login'
import POS from '@/pages/POS'
import Dashboard from '@/pages/Dashboard'
import DashboardLayout from '@/pages/dashboard/DashboardLayout'
import AccountPage from '@/pages/dashboard/AccountPage'
import MenuPage from '@/pages/dashboard/MenuPage'
import PaymentPage from '@/pages/dashboard/PaymentPage'

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
        <DashboardLayout page="Dashboard">
          <Dashboard />
        </DashboardLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/dashboard/account',
    element: (
      <ProtectedRoute roles={['ADMIN']}>
        <DashboardLayout page="Account">
          <AccountPage />
        </DashboardLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/dashboard/menu',
    element: (
      <ProtectedRoute roles={['ADMIN']}>
        <DashboardLayout page="Menu">
          <MenuPage />
        </DashboardLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/dashboard/payment',
    element: (
      <ProtectedRoute roles={['ADMIN']}>
        <DashboardLayout page="Payment">
          <PaymentPage />
        </DashboardLayout>
      </ProtectedRoute>
    ),
  },
  { path: '*', element: <Login /> },
])

export default function App() {
  return <RouterProvider router={router} />
}
