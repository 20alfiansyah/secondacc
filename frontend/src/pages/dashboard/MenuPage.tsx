import EmptyState from '@/components/ui/EmptyState'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

/** Stub Task 2.0 — diganti penuh oleh Task 2.2F (manajemen menu & upload gambar). */
export default function MenuPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-base">Manajemen Menu</CardTitle>
      </CardHeader>
      <CardContent>
        <EmptyState
          icon="restaurant_menu"
          title="Modul belum tersedia"
          description="Kelola produk, harga, upload gambar, dan status Sold Out — menyusul pada Fase 2."
        />
      </CardContent>
    </Card>
  )
}
