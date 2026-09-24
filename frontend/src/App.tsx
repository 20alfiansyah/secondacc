import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import ProtectedRoute from '@/components/ProtectedRoute'
import Login from '@/pages/Login'
import POS from '@/pages/POS'
import DashboardLayout from '@/pages/dashboard/DashboardLayout'
import DashboardPage from '@/pages/dashboard/DashboardPage'
import TargetPage from '@/pages/dashboard/TargetPage'
import HistoryPage from '@/pages/dashboard/HistoryPage'
import PrinterPage from '@/pages/dashboard/PrinterPage'
import AccountPage from '@/pages/dashboard/AccountPage'
import MenuPage from '@/pages/dashboard/MenuPage'
import PaymentPage from '@/pages/dashboard/PaymentPage'

// dipakai untuk memblokir navigasi route saat ada perubahan belum disimpan.
const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  {
    path: '/pos',
    element: (
      <ProtectedRoute roles={['CASHIER', 'ADMIN']}>
        <POS />
      </ProtectedRoute>
    ),
  },
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute roles={['ADMIN']}>
        <DashboardLayout page="Dashboard">
          <DashboardPage />
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
  {
    path: '/dashboard/target',
    element: (
      <ProtectedRoute roles={['ADMIN']}>
        <DashboardLayout page="Target">
          <TargetPage />
        </DashboardLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/dashboard/printer',
    element: (
      <ProtectedRoute roles={['ADMIN']}>
        <DashboardLayout page="Printer">
          <PrinterPage />
        </DashboardLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/dashboard/history',
    element: (
      <ProtectedRoute roles={['ADMIN']}>
        <DashboardLayout page="History">
          <HistoryPage />
        </DashboardLayout>
      </ProtectedRoute>
    ),
  },
  { path: '*', element: <Login /> },
])

export default function App() {
  return <RouterProvider router={router} />
}
