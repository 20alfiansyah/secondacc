# 10. Rencana Implementasi Fase 3 — Dashboard Analitik, Target Omset & Laporan

> **WAJIB dibaca sebelum koding task 3.x.** Fondasi: `docs/9_PHASE2_REFERENCE.md` (konvensi & gotcha masih berlaku), roadmap: `docs/7_ROADMAP_TASKS.md` (FASE 3), proses: `AGENTS.md` (Ponytail KISS/YAGNI + TDD).
> Disusun dari state `main` = `57b76da` (2026-09-23): backend **94/94** test, tsc bersih, frontend build ✓.
> **Cara pakai:** §4 KONTRAK API adalah perjanjian beku antara track Backend dan Frontend. Setelah bagian ini dibaca, BE dan FE dapat mengerjakan semua task-nya **paralel penuh** tanpa menunggu satu sama lain — FE mengkoding + build terhadap tipe kontrak, BE mengkoding + test terhadap spesifikasi kontrak. Pertemuan pertama keduanya hanya di Wave 3 (integrasi).

---

## 1. State & aturan main

- **Baseline:** worktree `feat-phase-3` sudah di-FF ke `main` (`57b76da`). Branch kerja: `20alfiansyah/feat-phase-3` (0 komit di depan, aman).
- **Flow per task** (sama seperti Fase 2): worktree Orca per task (`orca worktree create --name fx-* --base-branch main --agent omp`), 1 task atomic, commit **setelah** semua gate lulus, merge `--no-ff` ke `main`.
- **Gate verifikasi sebelum commit:**
  - Backend: `cd backend && npm test` (baseline **94/94** — angka bertambah, tidak boleh turun) + `npx tsc --noEmit`.
  - Frontend: `cd frontend && npm run build` (= typecheck + build).
- **Guardrails (AGENTS.md):** uang = integer rupiah (jangan float); agregasi wajib filter `status: 'PAID'`; tidak ada delete data transaksi; spec ditulis dulu (TDD) untuk semua logika hitung.

## 2. Scope — apa saja yang dibangun

| Roadmap | Track | Judul |
|---|---|---|
| 3.1 | BE | Modul `dashboard/` — `GET /api/dashboard/overview` (pie gender, bar omset 7 hari, best seller, progress target) |
| 3.3 | BE | Modul `targets/` — `GET`/`PUT /api/targets` (simpan target omset per bulan ke `monthly_targets`) |
| 3.4 | BE | Perluasan `GET /api/orders/history` — filter `gender` + `product` |
| 3.0 | FE | Fondasi: rute + nav + stub page + tipe kontrak di `client.ts` |
| 3.2 | FE | Halaman `/dashboard` — 4 grid Recharts |
| 3.3 | FE | Halaman `/dashboard/target` — form target omset |
| 3.4 | FE | Halaman `/dashboard/history` — filter, export CSV, reprint struk |
| 3.5 | Integrasi | Registrasi modul, mirror kontrak, verifikasi penuh, E2E smoke |

Tidak perlu migration baru — `MonthlyTarget` sudah ada di schema+tabel. CSV export **client-side** (KISS, dataset kafe kecil); tidak ada endpoint export. Reprint **reuse** `ReceiptModal` + `GET /api/orders/:id` dari POS; tidak ada endpoint baru.

## 3. Wave paralel & kepemilikan file

```
Wave 1 (paralel penuh, 5 jalur) : 3.1B ∥ 3.3B ∥ 3.4B ∥ 3.0F
Wave 2 (paralel, butuh 3.0F)    : 3.2F ∥ 3.3F ∥ 3.4F      ← TIDAK menunggu BE
Wave 3 (integrator tunggal)     : 3.5 — gabung, verifikasi, E2E, roadmap
```

| Task | File yang IA pegang (TIDAK disentuh task lain) |
|---|---|
| 3.1B | `backend/src/dashboard/**` (modul baru) |
| 3.3B | `backend/src/targets/**` (modul baru) |
| 3.4B | `backend/src/orders/orders.controller.ts`, `orders.service.ts`, `orders.service.spec.ts` |
| 3.0F | `frontend/src/App.tsx`, `components/navItems.ts`, `NavigationRail.tsx`, `MobileNav.tsx`, `ui/Icon.tsx`, stub `pages/dashboard/{DashboardPage,TargetPage,HistoryPage}.tsx`, section baru `api/client.ts` |
| 3.2F | `pages/dashboard/DashboardPage.tsx` (isi), `frontend/package.json` (install recharts), `index.css` (token bila perlu) |
| 3.3F | `pages/dashboard/TargetPage.tsx` (isi) |
| 3.4F | `pages/dashboard/HistoryPage.tsx` + section `Orders` di `client.ts` (param opsional) |
| 3.5 | `backend/src/app.module.ts`, `docs/6_API_CONTRACTS.md`, `docs/7_ROADMAP_TASKS.md` |

**Aturan konflik:** `app.module.ts` HANYA disentuh 3.5 (preseden Fase 2). `client.ts`: 3.0F membuat 2 section baru di area berbeda; 3.4F satu-satunya yang mengedit section `Orders`. Tidak ada file lain yang dipegang >1 task → semua task dalam satu wave bisa jalan serentak tanpa koordinasi.

## 4. KONTRAK API (BEKU — perubahan wajib update dokumen ini dulu)

Semua endpoint: prefix `/api`, envelope `{ success: true, data }`, JWT wajib. Error = NestJS exception `{ code: UPPER_SNAKE_CASE, message: English }`.

### 4.1 `GET /api/dashboard/overview` — ADMIN

Query (semua opsional): `month` (1–12), `year`, `tzOffset` (menit, konvensi `Date.getTimezoneOffset()`; browser WIB mengirim `-420`; default `0` = UTC). Batas hari & batas bulan dihitung di zona `tzOffset` agar bucket harian tidak meleset.

```json
{
  "success": true,
  "data": {
    "period": { "month": 9, "year": 2026 },
    "gender": { "male": 12, "female": 9, "unknown": 3 },
    "summary": { "totalRevenue": 21515000, "totalOrders": 5, "averageTicket": 4303000 },
    "dailyRevenue": [ { "date": "2026-09-17", "revenue": 1250000 } ],
    "bestSellers": [ { "productId": 3, "name": "Kopi Susu Gula Aren", "quantity": 42, "revenue": 294000 } ],
    "target": { "month": 9, "year": 2026, "targetAmount": 50000000, "achievedAmount": 21500000, "percent": 43 }
  }
}
```

Semantik terkunci:
1. **PAID-only.** Semua agregasi hanya dari `Order.status = 'PAID'`.
2. `gender`: hitung order dalam bulan terpilih (default: bulan berjalan). `L`→`male`, `P`→`female`, `null`→`unknown` (wajib ada, pie harus toleran null).
3. `dailyRevenue`: **tepat 7 entri** berurutan, hari terakhir = "hari ini" versi `tzOffset`, hari tanpa transaksi tetap muncul dengan `revenue: 0`, format `date` = `YYYY-MM-DD`, `revenue` = sum `grandTotal`.
4. `bestSellers`: dari `OrderItem` milik order PAID bulan terpilih; group by `productId`, sum `quantity` & sum `subtotal` (→`revenue`); urut `quantity` desc, tie-break `productId` asc; **maks 5**; `name` dari relasi product.
5. `target`: target bulan terpilih dari `monthly_targets`. Belum diset → `"target": null` (seluruh objek). `percent` = `Math.round(achieved * 100 / target)`; `target = 0` → `percent: null`.
6. **BigInt dilarang bocor**: `targetAmount` BigInt → `Number()` di service sebelum respons. Mengembalikan BigInt mentah = `JSON.stringify` crash.
7. `summary`: dari order PAID bulan terpilih — `totalRevenue` (sum grandTotal), `totalOrders` (jumlah order), `averageTicket` = `Math.round(totalRevenue / totalOrders)` (0 bila tanpa order). Integer rupiah.
8. Semua nominal = Number integer rupiah.

### 4.2 `GET /api/targets` & `PUT /api/targets` — ADMIN

`GET /api/targets?month=&year=` (default bulan berjalan):

```json
{ "success": true, "data": { "month": 9, "year": 2026, "targetAmount": 50000000 } }
```
Belum diset → `targetAmount: null` (bukan 404).

`PUT /api/targets` — body persis `{ "month": 9, "year": 2026, "targetAmount": 50000000 }`, **upsert** pada unique `[month, year]` (setting, bukan data transaksional — boleh di-update). Respons 200 dengan bentuk sama seperti GET.

Validasi (DTO class-validator + guard service): `month` int 1–12, `year` int 2000–2100, `targetAmount` int 0–1_000_000_000_000. Error codes baru: `INVALID_MONTH`(400), `INVALID_YEAR`(400), `INVALID_TARGET_AMOUNT`(400). Tidak ada DELETE (upsert menggantikan).

### 4.3 `GET /api/orders/history?from&to&search&gender&product`

Param baru (keduanya opsional, perilaku lama tidak berubah — drawer Order History kasir aman):
- `gender`: `L` | `P` → filter `customerGender`. Nilai lain → `INVALID_GENDER`(400). Null gender sengaja ter Exclude saat filter aktif.
- `product`: nama produk parsial, case-insensitive → `where.orderItems = { some: { product: { name: { contains, mode: 'insensitive' } } } }`.

**Bentuk baris respons TIDAK berubah** (invoiceNumber, customerName, customerGender, grandTotal, createdAt, cashier, payment) — FE memakai mapping `toOrderSummary` yang sudah ada.

### 4.4 Tipe TypeScript kontrak (FE, section `client.ts` oleh 3.0F)

```ts
export interface DashboardOverview {
  period: { month: number; year: number };
  gender: { male: number; female: number; unknown: number };
  dailyRevenue: Array<{ date: string; revenue: number }>;
  bestSellers: Array<{ productId: number; name: string; quantity: number; revenue: number }>;
  target: { month: number; year: number; targetAmount: number; achievedAmount: number; percent: number } | null;
}
export interface MonthlyTarget { month: number; year: number; targetAmount: number | null; }
```

Fungsi: `fetchDashboardOverview(opts?: { month?: number; year?: number; tzOffset?: number })`, `fetchMonthlyTarget(opts?: { month?: number; year?: number })`, `saveMonthlyTarget(input: { month: number; year: number; targetAmount: number }): Promise<MonthlyTarget>`; `fetchOrderHistory(params?: { from?: string; to?: string; search?: string; gender?: 'L' | 'P'; product?: string })`.

### 4.5 Pemetaan presentasi (FE)

- Progress target (Grid 4): `percent === null` → abu "No target"; `< 100` merah; `== 100` kuning; `> 100` hijau (persis roadmap 🔴🟡🟢).
- Pie gender: 3 slice `Male`/`Female`/`Unknown`.
- Bar omset: 7 hari terakhir, label tanggal singkat + format Rp.
- Dashboard tanpa month picker (YAGNI) — selalu bulan berjalan; param tetap ada di kontrak untuk kebutuhan lanjutan.

## 5. Task Backend (TDD — spec dulu, baru implement)

### 3.1B — Modul `backend/src/dashboard/`
Anatomi standar §9.1 referensi: `dashboard.module.ts`, `dashboard.controller.ts` (`@Controller('dashboard')`, class-level `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(Role.ADMIN)`), `dashboard.service.ts`, `dashboard.service.spec.ts`. Handler tipis, service murni aggregasi.

Spec WAJIB (tulis dulu):
1. Hanya order PAID dihitung (OPEN_BILL/CANCELLED diabaikan).
2. Gender: `L`→male, `P`→female, null→`unknown`.
3. `dailyRevenue` tepat 7 entri urut naik, zero-fill, bucket mengikuti `tzOffset`.
4. Best seller: group/sum benar, urutan desc, maks 5, ambil nama produk.
5. Target BigInt → Number; tanpa target → `target: null`; `percent` Math.round; target 0 → `percent: null`.
6. `month`/`year` kosong → default bulan berjalan.
7. Semua sum dalam integer rupiah (tanpa float).

**Acceptance:** `npm test` ≥ 94 + case baru lulus; `tsc --noEmit` bersih. Modul belum perlu didaftar di `app.module.ts` (tugas 3.5).

### 3.3B — Modul `backend/src/targets/`
`targets.module.ts|controller.ts|service.ts` + `dto/targets.dto.ts` + `targets.service.spec.ts`. `GET` baca + `PUT` upsert (`prisma.monthlyTarget.upsert`), simpan `BigInt(targetAmount)`.

Spec WAJIB: GET tanpa data → `targetAmount: null`; GET dengan data → Number; PUT baru → create; PUT bulan sama → update tanpa duplikat; validasi bulan/tahun/amount invalid → exception code sesuai §4.2; konversi BigInt dua arah benar.

**Acceptance:** sama seperti 3.1B.

### 3.4B — Perluasan `orders.service.history`
Tambah param `gender?` + `product?` (service + controller `@Query`). Validasi `gender` manual (pola `DATE_RE` yang ada) → `INVALID_GENDER`. Filter product via `orderItems.some.product.name contains insensitive`.

Spec tambahan `orders.service.spec.ts`: filter L/P benar (null ter Exclude); product parsial insensitive; kombinasi dengan `from/to/search`; gender invalid → exception; **tanpa param = perilaku lama** (regresi drawer POS).

**Acceptance:** `npm test` ≥ 94 + case baru; endpoint lama tidak berubah bentuk.

## 6. Task Frontend

### 3.0F — Fondasi (harus sebelum 3.2F/3.3F/3.4F)
1. `App.tsx`: `/dashboard` → `DashboardPage` (ganti placeholder), tambah `/dashboard/target` → `TargetPage`, `/dashboard/history` → `HistoryPage`. Semua `ProtectedRoute roles={['ADMIN']}` + `DashboardLayout page="..."`.
2. `navItems.ts`: item baru `{ id: 'target', label: 'Target', icon: 'flag' }` di grup management-ops; ubah item `reports`: buang `notice`, jadi navigate `/dashboard/history` (label `History`, icon `analytics` — glyph sudah ada).
3. `Icon.tsx`: tambah glyph `flag`. Mapping onClick di `NavigationRail.tsx` **dan** `MobileNav.tsx` (dua-duanya, jangan satu).
4. `client.ts`: section `// ===== Dashboard Analytics =====` + `// ===== Monthly Targets =====` (tipe §4.4 + fungsi).
5. Tiga stub page minimal (pola placeholder Fase 2).

**Acceptance:** build lulus; admin melihat nav Target+History di rail & drawer mobile; kasir tidak melihat keduanya (gating role sudah ada).

### 3.2F — Halaman Dashboard 4 grid (`/dashboard`)
- `npm install recharts` (React 19 → versi ≥ 2.15; build jadi pembuktinya).
- 4 Card (pola §9.2 referensi, `grid-cols-1 md:grid-cols-2`): **Pie** gender (slice Unknown wajib), **Bar** `dailyRevenue` (7 hari, tooltip Rp), **List** best seller (nama, qty, revenue, urut), **Progress** target (bar + label percent + achieved/target Rp; warna §4.5).
- `fetchDashboardOverview` satu kali; `[loading, error, data]` + `role="alert"` band; `EmptyState` untuk target belum diset.
- Recharts dibungkus `ResponsiveContainer` di CardContent dengan tinggi eksplisit (`h-64`+) — tanpa tinggi eksplisit chart tidak render.
- Kalau pakai class warna baru (merah/kuning/hijau progress) → tambahkan token `@theme` di `index.css` (aturan gotcha).

**Acceptance:** build lulus; halaman render 4 grid dgn data nyata setelah integrasi (W3).

### 3.3F — Halaman Target Omset (`/dashboard/target`)
- Prefill dari `fetchMonthlyTarget`; form: bulan (select 1–12, label EN), tahun, nominal rupiah (input integer, strip non-digit).
- Simpan → `saveMonthlyTarget` (PUT) → notice sukses + refetch; error `role="alert"`; konfirmasi pola native.
- Tampilkan ringkasan current target (Rp) + keterangan bulan terpilih.

**Acceptance:** build lulus; alur isi→simpan→terbaca kembali terhadap kontrak.

### 3.4F — Halaman Riwayat & Laporan (`/dashboard/history`)
- Filter: `from`/`to` (input date), `product` (SearchBar), `gender` (select All/L/P) → `fetchOrderHistory({ from, to, search, gender, product })` (perluasan param opsional di section Orders — milik 3.4F).
- Tabel: Invoice, Date, Customer, Gender, Payment Method, Total (header EN, `formatOrderLabel`/`format` util yang ada). Loading/error/EmptyState pola §9.2. Tanpa pagination (dataset kafe kecil, konsisten dgn drawer POS — YAGNI).
- **Export CSV** client-side dari baris terfilter: header `Invoice,Date,Customer,Gender,Payment Method,Total`, BOM UTF-8 (Excel), nilai di-quote, nama file `sales-report-YYYYMMDD-HHmm.csv`.
- **Reprint**: klik baris → `fetchOrderDetail(id)` → render `ReceiptModal` (reuse komponen POS) + `window.print()`.

**Acceptance:** build lulus; filter bekerja terhadap kontrak; CSV terunduh; struk tampil.

## 7. Task 3.5 — Integrasi & Verifikasi (Wave 3, satu owner)

1. Daftarkan `DashboardModule` + `TargetsModule` di `backend/src/app.module.ts`.
2. Mirror §4 dokumen ini ke `docs/6_API_CONTRACTS.md` (section Fase 3).
3. Gate penuh: `cd backend && npm test` + `npx tsc --noEmit` + `cd frontend && npm run build` — semua hijau.
4. Smoke E2E (browser, `admin/admin123`, backend :3001):
   - `/dashboard`: 4 grid terisi data nyata (ada order PAID 7 hari terakhir); pie menampilkan Unknown bila ada order tanpa gender.
   - `/dashboard/target`: set target 10.000.000 bulan berjalan → kembali ke `/dashboard`, progress bar persen/warna berubah.
   - `/dashboard/history`: filter gender + nama produk → baris sesuai; export CSV terunduh dan isinya cocok; klik baris → struk + print preview muncul.
   - Regresi: login kasir → drawer Order History POS masih berfungsi (param baru opsional).
5. Tick roadmap `[x]` 3.1–3.4 + catat hasil; commit; merge `--no-ff` ke `main`.
6. Deploy (opsional): `docker compose -f docker-compose.yml -f docker-compose.fase2.yml --project-directory F:/Project/secondacc up -d --build` + hard reload (gotcha CSS hash).

## 8. Gotcha spesifik Fase 3 (semua nyata, jangan diulang)

1. **BigInt = bom waktu**: `JSON.stringify(BigInt)` lempar TypeError. Konversi di service, bukan di FE.
2. **Lupa `status: 'PAID'`** = semua angka dashboard salah (OPEN_BILL ikut terhitung).
3. **`customerGender` nullable**: pie wajib punya slice Unknown; filter history L/P memang men Exclude null.
4. **Zona waktu bucket harian**: gunakan `tzOffset`; hardcode UTC menggeser transaksi jam 00:00–06:59 WIB ke hari sebelumnya.
5. **ValidationPipe `whitelist + forbidNonWhitelisted`**: body PUT targets harus persis 3 field — field asing = 400.
6. **recharts + React 19**: install `recharts@latest` (≥2.15); bila build gagal tipe, jangan tambah `@types` — cek versi.
7. **Uang tetap integer**: percent satu-satunya nilai hasil `Math.round`; jangan pernah menghitung nominal dengan float.
8. Konvensi UI terkunci: `h-10 rounded-xl`, outline bukan shadow, confirm() native, `role="alert"`, UI English + komentar Indonesia, archive-not-delete (history tidak punya delete).
9. Reprint jangan bikin endpoint baru — `GET /api/orders/:id` sudah cukup; reuse `ReceiptModal`.
