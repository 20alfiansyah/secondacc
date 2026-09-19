import EmptyState from '@/components/ui/EmptyState'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

/** Stub Task 2.0 — diganti penuh oleh Task 2.3F (pengaturan channel pembayaran). */
export default function PaymentPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-base">Channel Pembayaran</CardTitle>
      </CardHeader>
      <CardContent>
        <EmptyState
          icon="payments"
          title="Modul belum tersedia"
          description="Atur channel pembayaran (Tunai, QRIS, EDC) beserta status aktifnya — menyusul pada Fase 2."
        />
      </CardContent>
    </Card>
  )
}
