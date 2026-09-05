import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { setUnauthorizedHandler } from '@/api/client'
import { useAuthStore } from '@/store/authStore'

// Saat API menolak dengan 401 (token kadaluarsa/tidak valid),
// bersihkan sesi dan kembalikan user ke halaman login.
setUnauthorizedHandler(() => {
  useAuthStore.getState().logout()
  window.location.assign('/login')
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
