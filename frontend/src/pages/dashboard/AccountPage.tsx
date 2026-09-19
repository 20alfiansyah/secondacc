import EmptyState from '@/components/ui/EmptyState'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

/** Stub Task 2.0 — diganti penuh oleh Task 2.1F (manajemen akun staf). */
export default function AccountPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-base">Manajemen Akun Staf</CardTitle>
      </CardHeader>
      <CardContent>
        <EmptyState
          icon="manage_accounts"
          title="Modul belum tersedia"
          description="Buat akun kasir/admin, ganti password, dan atur status akses — menyusul pada Fase 2."
        />
      </CardContent>
    </Card>
  )
}
