import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { fetchDashboardOverview } from '@/api/client'
import type { DashboardOverview } from '@/api/client'
import EmptyState from '@/components/ui/EmptyState'
import Icon from '@/components/ui/Icon'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { formatRupiah } from '@/utils/format'

/**
 * Halaman analytics dashboard admin (Task 3.2F) — 4 grid pola §9.2:
 * pie gender, bar omset 7 hari, list best seller, progress target omset.
 * Data dari GET /api/dashboard/overview (bulan berjalan), fetch sekali.
 */
export default function DashboardPage() {
  const [data, setData] = useState<DashboardOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        // Fetch sekali, tanpa month picker (YAGNI) — selalu bulan berjalan.
        // tzOffset dikirim agar bucket 7 hari mengikuti zona browser (gotcha #4 Fase 3).
        const overview = await fetchDashboardOverview({ tzOffset: new Date().getTimezoneOffset() })
        if (!cancelled) setData(overview)
      } catch {
        if (!cancelled) setError('Failed to load analytics overview. Try again.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  // Pie gender: 3 slice wajib (Unknown untuk order tanpa gender — gotcha #3).
  const genderData = data
    ? [
        { label: 'Male', value: data.gender.male, fill: '#447C84' },
        { label: 'Female', value: data.gender.female, fill: '#65AF92' },
        { label: 'Unknown', value: data.gender.unknown, fill: '#CBD5E1' },
      ]
    : []
  const totalOrders = genderData.reduce((sum, g) => sum + g.value, 0)

  // Bar omset: label tanggal singkat ("Sep 17") — nilai penuh lewat tooltip Rp.
  const revenueData =
    data?.dailyRevenue.map((d) => ({ label: shortDate(d.date), revenue: d.revenue })) ?? []

  // Empty bersama saat error (data null) — detail per kartu tetap spesifik.
  const noData = data
    ? null
    : { icon: 'dashboard', title: 'No data', description: 'Analytics overview is unavailable right now.' }

  return (
    <div className="space-y-4">
      {/* Band error di atas grid — pola role="alert" §9.2. */}
      {error && (
        <p
          role="alert"
          className="rounded-xl bg-destructive/10 px-3.5 py-2.5 text-xs font-semibold text-destructive"
        >
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Grid 1: pie gender (3 slice, slice Unknown wajib ada). */}
        <AnalyticsCard
          icon="person"
          title="Customer Gender"
          subtitle="Paid orders this month by customer gender."
          loading={loading}
          empty={
            noData ??
            (totalOrders === 0
              ? { icon: 'person', title: 'No orders yet', description: 'No paid orders recorded this month.' }
              : null)
          }
        >
          <div className="space-y-3">
            {/* Tinggi eksplisit h-64 — tanpa itu ResponsiveContainer tidak merender. */}
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={genderData}
                    dataKey="value"
                    nameKey="label"
                    innerRadius={58}
                    outerRadius={90}
                    paddingAngle={2}
                    strokeWidth={0}
                  >
                    {genderData.map((g) => (
                      <Cell key={g.label} fill={g.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value} orders`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Legend manual: titik warna + label + jumlah (senada desain POS). */}
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
              {genderData.map((g) => (
                <div key={g.label} className="flex items-center gap-1.5 text-xs">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: g.fill }} />
                  <span className="font-semibold text-slate-700">{g.label}</span>
                  <span className="text-slate-400">{g.value}</span>
                </div>
              ))}
            </div>
          </div>
        </AnalyticsCard>

        {/* Grid 2: bar omset 7 hari terakhir, tooltip format Rp. */}
        <AnalyticsCard
          icon="analytics"
          title="Daily Revenue"
          subtitle="Paid revenue per day for the last 7 days."
          loading={loading}
          empty={noData}
        >
          {/* Tinggi eksplisit h-64 — tanpa itu ResponsiveContainer tidak merender. */}
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#E2E8F0" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: '#94A3B8' }}
                  dy={6}
                />
                {/* Nilai sumbu Y disembunyikan — angka jutaan panjang; detail lewat tooltip. */}
                <YAxis hide />
                <Tooltip
                  cursor={{ fill: 'rgba(68,124,132,0.08)' }}
                  formatter={(value) => formatRupiah(Number(value))}
                />
                <Bar dataKey="revenue" fill="#447C84" radius={[6, 6, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </AnalyticsCard>

        {/* Grid 3: list best seller (nama, qty, revenue Rp) — urutan dari server. */}
        <AnalyticsCard
          icon="local_fire_department"
          title="Best Sellers"
          subtitle="Top products by quantity sold this month."
          loading={loading}
          empty={
            noData ??
            (data && data.bestSellers.length === 0
              ? { icon: 'shopping_bag', title: 'No sales yet', description: 'No paid orders recorded this month.' }
              : null)
          }
        >
          <ul className="divide-y divide-slate-100">
            {data!.bestSellers.map((item, index) => (
              <li key={item.productId} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                {/* Peringkat: badge kecil, 3 teratas di-highlight teal. */}
                <span
                  className={cn(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
                    index < 3 ? 'bg-primary-light text-primary-dark' : 'bg-slate-100 text-slate-500',
                  )}
                >
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800">{item.name}</p>
                  <p className="text-xs text-slate-400">{item.quantity} sold</p>
                </div>
                <span className="shrink-0 text-sm font-semibold text-slate-700">{formatRupiah(item.revenue)}</span>
              </li>
            ))}
          </ul>
        </AnalyticsCard>

        {/* Grid 4: progress target omzet — warna sesuai §4.5 (abu/merah/kuning/hijau). */}
        <AnalyticsCard
          icon="flag"
          title="Monthly Target"
          subtitle="Monthly revenue target progress."
          loading={loading}
          empty={
            noData ?? {
              icon: 'flag',
              title: 'No target set',
              description: 'Set a monthly target on the Target page to track progress here.',
            }
          }
        >
          <div className="space-y-3">
            <div className="flex items-end justify-between gap-2">
              {/* Label persen; target 0 (percent null) → teks "No target" abu. */}
              <p
                className={cn(
                  'font-display text-2xl font-bold',
                  data!.target!.percent === null ? 'text-slate-400' : 'text-slate-900',
                )}
              >
                {data!.target!.percent === null ? 'No target' : `${data!.target!.percent}%`}
              </p>
              <p className="text-xs text-slate-400">
                {formatRupiah(data!.target!.achievedAmount)} of {formatRupiah(data!.target!.targetAmount)}
              </p>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={cn('h-full rounded-full transition-all', targetBarClass(data!.target!.percent))}
                style={{
                  width: `${data!.target!.percent === null ? 100 : Math.min(data!.target!.percent, 100)}%`,
                }}
              />
            </div>
          </div>
        </AnalyticsCard>
      </div>
    </div>
  )
}

/**
 * Kartu grid analytics: band header (ikon + judul uppercase + subtitle) +
 * area konten dengan pola loading/empty seragam §9.2. children = konten data.
 */
function AnalyticsCard({
  icon,
  title,
  subtitle,
  loading,
  empty,
  children,
}: {
  icon: string
  title: string
  subtitle: string
  loading: boolean
  /** Non-null = tampilan kosong saat tidak loading (data null / memang kosong). */
  empty: { icon: string; title: string; description?: string } | null
  children: ReactNode
}) {
  return (
    <Card>
      {/* Band header pola PaymentPage: ikon + judul uppercase + subtitle. */}
      <CardHeader className="space-y-0.5 p-4 pb-3 sm:p-6 sm:pb-3">
        <div className="flex items-center gap-2">
          <Icon name={icon} className="text-[20px] text-[#447C84]" />
          <span className="font-display text-xs font-bold uppercase tracking-wider text-slate-900">{title}</span>
        </div>
        <p className="text-xs text-slate-400">{subtitle}</p>
      </CardHeader>
      <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
        {loading ? (
          <EmptyState loading icon={icon} title="Loading..." description="Fetching data from the server." />
        ) : empty ? (
          <EmptyState icon={empty.icon} title={empty.title} description={empty.description} />
        ) : (
          children
        )}
      </CardContent>
    </Card>
  )
}

/** "2026-09-17" -> "Sep 17" — parse manual (bukan new Date(iso)) agar bebas geser timezone UTC. */
function shortDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { day: '2-digit', month: 'short' })
}

/** Warna bar progress target (§4.5): null abu, <100 merah, ==100 kuning, >100 hijau. */
function targetBarClass(percent: number | null): string {
  if (percent === null) return 'bg-slate-300'
  if (percent < 100) return 'bg-destructive'
  if (percent === 100) return 'bg-warning'
  return 'bg-live'
}
