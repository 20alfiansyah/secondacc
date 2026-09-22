# 9. Referensi Implementasi Fase 3 (Hasil Fase 2)

> **WAJIB dibaca sebelum koding** untuk semua task Fase 3 (dashboard analitik, target omset, history/laporan).
> Fondasi: `docs/8_PHASE1_REFERENCE.md` (masih berlaku), roadmap: `docs/7_ROADMAP_TASKS.md`, proses: `AGENTS.md` (Ponytail KISS/YAGNI + TDD).
> Disusun dari state repo pasca-merge `feat/phase-2` → `main` (`c6afcbd`, 2026-09-22). Backend **94/94** test, tsc bersih, frontend build ✓, deploy live.

---

## 1. State Repo & Deployment (mulai dari sini)

- **Branch kerja:** `main` = `c6afcbd` (berisi seluruh `feat/phase-2`). Worktree Orca aktif: `C:/Users/FAHREZI/orca/workspaces/secondacc/feat-phase-2` → branch `feat/phase-2`. Repo utama `F:/Project/secondacc` = checkout `main`.
- **Flow task Fase 3** (sama seperti Fase 2): worktree Orca per task (`orca worktree create --name fx-* --base-branch main --agent omp`), 1 task atomic, commit per task **setelah** build+test lulus, merge `--no-ff` ke `main`. Tweak kecil boleh langsung di `feat-phase-2`.
- **Verifikasi wajib sebelum commit:** `cd backend && npm test` (baseline **94/94** — angka bertambah, tidak boleh turun), `npx tsc --noEmit`, `cd frontend && npm run build`.
- **Deploy:** `docker compose -f docker-compose.yml -f docker-compose.fase2.yml --project-directory F:/Project/secondacc up -d --build`. Entrypoint backend otomatis `prisma migrate deploy` (+ seed bila `SKIP_SEED!=1`). **Backend port = 3001** (frontend 5173).
- Kredensial: `admin/admin123`, kasir `siti/kasir123`. Token simpan via `/tmp/admtok` untuk curl.
- **Recharts belum ter-install** di frontend — install saat Task 3.2.

## 2. Backend — Tambahan Fase 2 (REALITAS)

### 2.1 Modul & endpoint (semuanya envelope `{ success: true, data }`)

| Modul | Route | Role akses | Catatan |
|---|---|---|---|
| `users/` | `GET /api/users`, `POST /api/users`, `PATCH :id/password`, `PATCH :id/toggle-status` | ADMIN semua | bcryptjs, min 6 char; password tidak pernah dikirim balik |
| `products/` | `GET ''`, `GET 'archived'`, `POST` (multipart `FileInterceptor('image')`), `PUT ':id'`, `PATCH ':id/archive'`, `PATCH ':id/restore'`, `PATCH ':id/toggle-availability'` | GET auth (ADMIN+CASHIER), tulisan ADMIN | **Tidak ada DELETE** — arsip menggantikan delete |
| `categories/` | `GET ''`, `GET 'archived'`, `POST`, `PATCH ':id'`, `PATCH ':id/archive'`, `PATCH ':id/restore'` | tulisan ADMIN | Slug auto dari nama; `DELETE` dihapus (404) |
| `payment-channels/` | `GET ?isActive=`, `POST`, `PATCH ':id/toggle'` | GET auth, tulisan ADMIN | POS `PaymentModal` fetch `?isActive=true` + fallback hardcoded |
| `orders/` | Fase 1 tetap + `open-bill`, `:id/items`, `:id/checkout`; messages EN | — | `assertPaymentCoversTotal` di `financial.calculator.ts` |

- Guard: class-level `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(Role.ADMIN)`; `Role` diimpor dari `@prisma/client` (**hanya `ADMIN`/`CASHIER`** — `INVENTORY` sudah dihapus oleh main `d9300cb`).
- **Products toggle sold-out** kini ADMIN-only + guard `PRODUCT_SOLD_OUT` (produk habis tidak bisa masuk cart/checkout).

### 2.2 Schema (fase 2 tambah/ubah)

- `Category`: + `slug` (unique), `isActive`. `Product`: + `imageUrl` (relative `/uploads/products/<uuid>.<ext>`), `isRecommended`, `isBestSeller`, `isActive`.
- `PaymentChannel`: `name`, `category` (`CASH|THIRD_PARTY|EDC`), `isActive` — dipakai POS checkout.
- Migration baru: `20260920000000_category_is_active`, `20260921000000_product_is_active`. (`20260919000000_drop_unused_tables` dari main: `tables`/`monthly_targets` **tetap ada di schema** — `MonthlyTarget` justru dipakai Fase 3; hanya endpoint/module-nya yang dihapus.)
- **`model MonthlyTarget` SUDAH ADA** di `schema.prisma` + tabel `monthly_targets` di DB (`month`, `year`, `targetAmount BigInt`, unique `[month, year]`) — langsung pakai untuk Task 3.3, tidak perlu migration baru.

### 2.3 Error code baru fase 2 (UPPER_SNAKE_CASE, jangan bentrok)

`USERNAME_TAKEN`(409), `CANNOT_DISABLE_SELF`(400), `USER_NOT_FOUND`(404), `INVALID_CATEGORY`(400), `SLUG_TAKEN`(409), `CATEGORY_NOT_FOUND`(404), `CHANNEL_NOT_FOUND`(404), `INVALID_FILE_TYPE`(415), `PRODUCT_SOLD_OUT`(400). Pesan error **English** (di-transplant dari feature side saat merge).

- Upload: Multer ke `./uploads/products`, UUID v4 + ext, JPEG/PNG/WEBP, ≤2 MB (`413` otomatis, `415 INVALID_FILE_TYPE`), `extname` dari MIME map — **jangan percaya nama file asli**.
- ServeStatic `/uploads` + nginx `location /uploads/ → proxy backend`; Docker: folder dibuat saat build (`Dockerfile` RUN mkdir sebelum drop privilege), volume `uploads_data` (lihat `docker-compose.fase2.yml`).
- **Uang = integer rupiah** (grandTotal Int, targetAmount BigInt). Jangan float. Rounding via `FinancialCalculator`; `assertPaymentCoversTotal` dijalankan sebelum menyimpan payment.

### 2.4 Data untuk agregasi Fase 3 (sudah tersedia di schema)

- `Order`: `customerGender` (`Gender L/P`, nullable — pie chart harus toleran null), `grandTotal Int`, `status` (`OPEN_BILL|PAID|CANCELLED` — **agregasi wajib filter `status: 'PAID'`**), `createdAt` (ada index), `cashierId`, `orderType`.
- `OrderItem`: relasi `orderId`+`productId`+`quantity`+`priceAtSale` — sumber best seller (`_count`/sum quantity).
- `Payment`: `methodName`, `amountPaid`, relasi 1:1 ke order.
- `monthly_targets` kosong — Task 3.3 mengisinya.

## 3. Frontend — tambahan & konvensi Fase 2

- **Routes** (`App.tsx`, semua `ProtectedRoute roles={['ADMIN']}`): `/dashboard` (placeholder — Task 3.2 mengisinya), `/dashboard/account`, `/dashboard/menu`, `/dashboard/payment`. Layout: `pages/dashboard/DashboardLayout.tsx` menerima `page` string untuk penandaan nav.
- **Halaman**: `AccountPage` (tabel staf: create/ganti password/toggle, confirm()), `MenuPage` (grid `ProductCard` **grouped per kategori** saat tab All, `ManageCategoriesDialog`, `ArchivedProductsDialog`, upload multipart), `PaymentPage` (switch + dialog tambah).
- **`navItems.ts`** = sumber tunggal data nav (rail + drawer mobile). Grup: `cashier-ops`, `management-ops`; komponen memetakan `id` → onClick. Gating role: `visibleGroups = role === 'ADMIN' ? groups : filter cashier-ops` di KEDUA komponen. **Kalau menambah halaman dashboard (Task 3.3/3.4), tambah item di sini + mapping di `NavigationRail.tsx` + `MobileNav.tsx` + glyph di `Icon.tsx`.**
- `api/client.ts`: section per fitur; `fetchPaymentChannels` dipakai `PaymentModal` (fallback hardcoded bila gagal). `CheckoutInput` = flat `{ customerGender, paymentCategory, methodName, amountPaid }`.
- `resolveProductImage` (`utils/productImage.ts`): pakai `imageUrl` apa adanya (`/uploads/...` DAN http), fallback ke `productImages.ts` map hanya untuk blank/`data:`. **Satu-satunya resolver — jangan duplikat lagi.**
- `PaymentModal` emit `CheckoutInput` flat (`{ customerGender, paymentCategory, methodName, amountPaid }`).
- Form/modal **tanpa library** (bukan Radix): overlay `div.fixed` + confirm() native + controlled input via native setter saat automation.

## 4. Konvensi yang terkunci (pakai, jangan ciptakan lagi)

- UI strings **English**, komentar kode Indonesia.
- **Archive, bukan delete** — data transaksi/produk/kategori append-only; restore = set `isActive=true`.
- Kontrol seragam: `h-10 rounded-xl` untuk semua tombol/search (semua breakpoint). **Pembeda visual = outline `border-slate-200/80`, BUKAN shadow** (preferensi user).
- Token warna custom di `index.css` `@theme` (`--color-live`, `--color-live-light`, `--color-live-border`, `--color-primary-light`, dst.) — **kalau menambah class warna custom, tambahkan token-nya** (lihat gotcha di bawah).
- Test backend: `cd backend && npm test` (jest, rootDir `src`, `*.spec.ts`); frontend `npm run build` = typecheck+build.

## 5. Gotcha (semua nyata, jangan diulang)

1. **Merge konflik semantik**: refactor main pernah menghapus "dead code" yang ternyata dipakai feature (`--color-live`, `manage_accounts`, nav items, resolver `/uploads`). Saat resolve konflik, **jangan ambil satu sisi bulat-bulat** — cross-check pemakai di feature tree. Sudah ada checklist sweep: bandingkan `git diff <base>..HEAD` per file, bukan asal main-side.
2. **Vite CSS hash + nginx `immutable`**: isi CSS berubah ≠ nama file berubah → browser bisa pegang CSS lama. Setelah deploy, hard reload (`Ctrl+Shift+R` / CDP `Page.reload {ignoreCache:true}`).
3. Worktree Orca per task: `orca worktree create --name fx-* --base-branch main --agent omp` (base sekarang `main`, bukan `feat/phase-2`).
4. Shell Windows: jangan `grep`/`heredoc` senyap gagal — pakai tool `grep`/`read`/`edit`. `git show branch:file` → dump ke file dulu.
5. Docker non-root `app` tidak boleh mkdir `/app` root — folder uploads dibuat di Dockerfile + volume `uploads_data` (jangan hilangkan saat main dulu menghapus overlay).
6. Input React di E2E: `fill`/`type` puppeteer sering gagal senyap → native setter + `dispatchEvent('input')` atau `page.keyboard.type` setelah focus.

## 6. Data operasional (state DB saat ini)

- Kategori seed + semua aktif; produk 29 aktif. Channel: QRIS BCA (THIRD_PARTY), Tunai (CASH), EDC Mandiri (EDC) — semua aktif.
- Users: `admin`(ADMIN), `siti`(CASHIER, aktif), `kasir_uji`/`kasir_smoke` (inactive), `ujien` (aktif).
- 2 produk masih archived (French Fries, Roti Bakar Cokelat Keju) + duplikat seed "Croissant Butter" (placeholder image) — kandidat di-archive manual via UI.
- Order lama: invoice `INV-YYYYMMDD-NNNN`, status PAID — data nyata untuk chart Fase 3 (7 hari terakhir ada transaksi).

## 7. Siap pakai untuk Fase 3

- `GET /api/dashboard/overview` (Task 3.1): sumber data = `Order` (`status: 'PAID'`, `customerGender` L/P/nullable, `grandTotal`, `createdAt` — ada index `createdAt`+`status`), `OrderItem` (best seller: group by `productId`, sum `quantity`), `MonthlyTarget` (sudah ada model+tabel; `targetAmount` **BigInt** → konversi hati-hati ke Number saat kalkulasi progres).
- Route dashboard kosong menunggu Task 3.2 (`pages/dashboard/DashboardPage` atau isi `/dashboard`); placeholder sekarang: "Analytics & settings modules will be implemented in Phase 2 & Phase 3".
- Nav: tambah item `reports` sudah ada di `navItems.ts` sebagai notice — ganti jadi navigate `/dashboard/history` di Task 3.4 (ingat: rail + mobile dua-duanya).
- Chart: install `recharts` saat Task 3.2 (belum ada). Ikuti pola halaman dashboard lain: fetch via section baru di `client.ts`, envelope `{ success, data }`.
- RBAC: semua endpoint dashboard aggregasi = ADMIN (pattern `@Roles(Role.ADMIN)` class-level + `RolesGuard`).
