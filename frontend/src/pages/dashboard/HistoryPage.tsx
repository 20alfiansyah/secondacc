import Icon from '@/components/ui/Icon'
import { Card, CardContent } from '@/components/ui/card'

/** Stub halaman riwayat & laporan — filter/CSV/reprint diisi di Task 3.4F. */
export default function HistoryPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-6">
      <Card className="w-full max-w-md rounded-3xl border border-border/80 bg-card p-6 shadow-card text-center">
        <CardContent className="space-y-4 pt-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Icon name="analytics" className="text-3xl" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Sales History</h1>
            <p className="text-xs text-muted-foreground mt-2">
              Filterable history, CSV export, and receipt reprint will be implemented in Phase 3.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
