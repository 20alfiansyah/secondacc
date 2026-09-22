# 8. Referensi Implementasi Fase 2 (Hasil Scan Fase 1)

> **WAJIB dibaca sebelum koding** untuk semua task Fase 2 (users, menu upload, payment-channels).
> Kontrak API final: `docs/6_API_CONTRACTS.md` §6.2 / §6.4 / §6.5. Aturan proses: `AGENTS.md` (Ponytail KISS/YAGNI + TDD).
> Disusun dari scan menyeluruh kode Fase 1 (backend + frontend), 2026-09-19.

---

## 1. Kontrak Response & Error (REALITAS implementasi)

- **Sukses:** controller merakit `{ success: true, data }` (bukan interceptor). Pengecualian: `POST /auth/login` → `{ success: true, token, user }`.
- **Error:** service melempar NestJS exception dengan body `{ code, message }` — TANPA wrapper `success/error`. Frontend membaca `error.response.data.message`… **koreksi:** konvensi frontend Fase 1 adalah `catch {}` generik + pesan sendiri; 401 ditangani interceptor terpusat. Ikuti itu.
- Mapping status: validasi tidak valid → 400; tidak ketemu → 404; bentrok/race → 409; kredensial → 401; role → 403. Pesan error **Bahasa Indonesia**.
- **Error code yang sudah dipakai (jangan bentrok, gaya UPPER_SNAKE_CASE):**
  `INVALID_CREDENTIALS`(401), `ACCOUNT_DISABLED`(401), `UNAUTHORIZED`(401), `FORBIDDEN`(403), `INVALID_CATEGORY_ID`(400), `PRODUCT_NOT_FOUND`(404), `CUSTOMER_NAME_REQUIRED`(400), `EMPTY_ITEMS`(400), `ORDER_NOT_FOUND`(404), `ORDER_NOT_OPEN_BILL`(409), `INSUFFICIENT_PAYMENT`(400), `INVALID_MONEY_INPUT`(400), `INVALID_DATE_FORMAT`(400), `INVALID_DATE_RANGE`(400).
  Baru Fase 2: `USERNAME_TAKEN`(409), `CANNOT_DISABLE_SELF`(400), `USER_NOT_FOUND`(404), `PRODUCT_IN_USE`(409), `FILE_TOO_LARGE`(413), `INVALID_FILE_TYPE`(415), `INVALID_CATEGORY`(400), `CHANNEL_NOT_FOUND`(404).

## 2. Backend (NestJS 10 + Prisma 6 + PostgreSQL)

### 2.1 Bentuk modul fitur
```ts
@Module({
  imports: [AuthModule],              // sumber JwtAuthGuard/RolesGuard
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}
```
- `PrismaModule` `@Global()` → **tidak perlu** di-import per modul.
- `PrismaService extends PrismaClient` + `onModuleInit/$connect`.

### 2.2 Controller
```ts
@Controller('products')               // JANGAN tulis 'api/products' — setGlobalPrefix('api')
@UseGuards(JwtAuthGuard)              // class-level; RolesGuard ditambah bila perlu role
export class ProductsController {
  @Get()
  findAll(...) {
    return this.productsService.findAll(filter).then((data) => ({ success: true, data }));
  }
}
```
- Path param numerik: `@Param('id', ParseIntPipe)`.
- Query filter: string mentah + parse manual di service (bukan DTO) — ikuti pola products.

### 2.3 Guard & Role (RBAC)
- `JwtAuthGuard` native (tanpa Passport) → `request.user` bertipe `JwtPayload = { sub: number; username: string; role: string }` (augmented via `src/types/express.d.ts`).
- `RolesGuard` + `@Roles('ADMIN')` **sudah ada, belum pernah dipakai** — Fase 2 mulai memakainya:
```ts
@UseGuards(JwtAuthGuard, RolesGuard)  // RolesGuard HARUS SETELAH JwtAuthGuard
@Roles('ADMIN')                       // handler- atau class-level
```
- Tanpa metadata `@Roles` = hanya butuh login (bebas role).

### 2.4 ValidationPipe global & implikasi multipart
```ts
new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true })
```
1. `FileInterceptor('image')` memproses file SEBELUM pipe → validasi mimetype/size manual di controller/service (atau multer `fileFilter`/`limits`).
2. Field teks multipart datang sebagai **string** → DTO wajib `@Type(() => Number)`; boolean dari string di-handle manual di service (pola `parseBool` products).
3. `forbidNonWhitelisted: true` → field form-data yang tak dideklarasikan di DTO = 400. Deklarasikan SEMUA field yang dikirim frontend.
4. Konvensi DTO (`dto/<modul>.dto.ts`, class-validator): field wajib `!`, opsional `?` + `@IsOptional()`, konversi `@Type(() => Number)`, enum Prisma langsung `@IsEnum(...)`, nested via `@ValidateNested({ each: true }) + @Type(...)`.

### 2.5 Pola test (jest, config inline di package.json, rootDir `src`, `*.spec.ts`)
```ts
// Mock PrismaService — nested jest.fn, TIDAK mock PrismaClient asli
prisma = { product: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() } };
const moduleRef = await Test.createTestingModule({
  providers: [ProductsService, { provide: PrismaService, useValue: prisma }],
}).compile();
service = moduleRef.get(ProductsService);
```
- Error: `await expect(...).rejects.toMatchObject({ response: { code: 'USERNAME_TAKEN' } })` — cek `code` di `response`, bukan cuma tipe exception.
- `$transaction`: `prisma.$transaction = jest.fn(async (cb) => cb(tx))` dengan `tx` mock-tree (lihat orders.service.spec.ts).
- Jalankan satu file (dari `backend/`): `npm test -- users.service.spec`.

### 2.6 Dependencies
- **Sudah ada, pakai:** `@nestjs/platform-express` (membawa **multer@2.x runtime**), `bcryptjs`+`@types/bcryptjs`, `@nestjs/jwt`, `@nestjs/config`, `class-validator`/`class-transformer`, `@prisma/client`+`prisma`, `@nestjs/testing`/jest/ts-jest.
- **Harus install (Fase 2):** `@types/multer` (dev, untuk `Express.Multer.File`) dan `@nestjs/serve-static` (ServeStaticModule `/uploads`).
- Tidak perlu: passport, platform-multer (tidak ada), throttler.

### 2.7 Gotcha (baca sebelum coding)
1. **Port:** `main.ts` `process.env.PORT || 3000`; dev lokal menjalankan backend di **3001** (Vite proxy `/api` → `http://localhost:3001`). Docker: `${BACKEND_PORT:-3000}:3000`.
2. **bcryptjs import:** `import * as bcrypt from 'bcryptjs'` (namespace) — jangan default import.
3. **BigInt patch** di top `main.ts` (`BigInt.prototype.toJSON`) — jangan dihapus (dipakai MonthlyTarget).
4. **`backend/uploads/` belum ada** — dibuat runtime (mkdir recursive di service) atau `.gitkeep`; URL publik `/uploads/products/<uuid>.<ext>`.
5. Bootstrap order: `NestFactory.create` → `setGlobalPrefix('api')` → `enableCors` → `useGlobalPipes` → `listen`. CORS `origin:'*'` TANPA credentials (Bearer, bukan cookie) — jangan diubah.
6. TS config longgar (`strictNullChecks:false`, `noImplicitAny:false`) — ikuti gaya existing, jangan "memperbaiki" global.
7. `req.user` → `req.user as JwtPayload` (augmentasi sudah ada di `src/types/express.d.ts`).
8. Harga/uang **integer Rupiah** — `@IsInt() @Min(1)`; jangan pernah float.
9. Skema siap pakai, **tanpa migration**: `User` (username unique, passwordHash, role, isActive), `Product.imageUrl String?`, `PaymentChannel` (name, category, isActive). `order_items.product_id` FK Restrict → DELETE produk terpakai = P2003/409.

## 3. Frontend (Vite + React 19 + Tailwind v4 + zustand)

### 3.1 Routing & guard
- `createBrowserRouter` (data router — bukan BrowserRouter; `useBlocker` dipakai POS). Route **flat**, render via `<RouterProvider>`.
- Tambah route ADMIN: entri flat + `ProtectedRoute roles={['ADMIN']}` (redirect ke home per role; tanpa redirect-back).
- 401 global: interceptor client.ts → `setUnauthorizedHandler` di main.tsx (logout + `/login`).

### 3.2 NavigationRail & layout
- Props wajib: `onOpenHistory`, `onLockRegister` (di dashboard → no-op/notice), opsional `onFeatureNotice`, `onSignOut`, `className`.
- NavItem/NavGroup internal (tidak di-export): `{ id, label, icon /* nama string */, active?, onClick }`. Grup ada: `cashier-ops` (register `point_of_sale` **active hard-coded**, history `receipt_long`) & `management-ops` (dashboard, inventory_2, analytics, tune — 3 terakhir hanya notice).
- **Role-gating tidak ada di nav** (hanya route-level) — item dashboard tetap tampil untuk semua; pengaman = ProtectedRoute.
- `active` hard-coded di item Register → saat dipakai di dashboard, parameterisasi item aktif (mis. prop `page` seperti MobileNav) — jangan biarkan Register menyala di halaman admin.
- Pasangan wajib: `NavigationRail className="hidden lg:flex"` + `<MobileNav page=... />` untuk `<lg` (MobileNav duplikat struktur groups — sinkronkan dua file).
- Layout acuan (POS): root `flex h-svh flex-col lg:flex-row` → nav → `<main className="flex min-w-0 flex-1 flex-col overflow-y-auto p-4 ...">` + `<TopBar page="..." />`. `SIDEBAR_TOGGLE_EVENT = 'cafe_pos:toggle-sidebar'`, collapse persist `cafe_pos_sidebar_collapsed`.

### 3.3 Design tokens (Tailwind v4 `@theme` di `src/index.css`; tanpa tailwind.config)
- Warna: `bg-primary`/`text-primary` `#447C84`; `text-primary-dark` `#2d5258`; `bg-primary-light` `#eef6f7`; `bg-accent` `#edf7f3`; `bg-live` `#65AF92`; `bg-background` `#F8FAFC`; `text-foreground` `#0F172A`; `border-border` `#E2E8F0`; `text-muted-foreground` `#64748B`; `bg-destructive`.
- Shadow: `shadow-subtle|card|card-hover|btn-bismark|modal`. Radius: `rounded-xl`=1rem, `rounded-2xl`=1.25rem. Font: `font-display`=Outfit, body=Plus Jakarta Sans.
- Kode baru **utamakan kelas token** (bukan hex literal — dua gaya hidup berdampingan, jangan tambah gaya ketiga).
- Icon: `<Icon name="snake_case" />` = wrapper lucide dengan MAP nama Material Symbols; **nama baru wajib ditambahkan ke MAP `Icon.tsx`**; fallback CircleAlert; ukuran via `text-[Npx]`, warna via currentColor.
- `cn()` (`lib/utils.ts`, clsx+tailwind-merge) wajib untuk merge className.

### 3.4 Modal & form (TANPA library — bukan Radix Dialog, bukan react-hook-form)
- Parent pegang state boolean, render `{open && <Modal/>}`; modal menerima props + callback (`onClose`, `onSubmit`), **modal tidak fetch**.
- Root overlay: `fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 (atau bg-black/60) backdrop-blur-[2px] p-4` + panel `max-w-md/xl rounded-2xl bg-white shadow-modal/2xl`.
- Escape: `useEffect` + `window keydown` (CustomItemModal/Drawer pattern). Backdrop click: `onMouseDown` target===currentTarget.
- Form: input controlled `useState`; validasi imperatif di submit; error `role="alert"` + kelas `bg-destructive/10 text-destructive`; angka uang disimpan **string** lalu divalidasi integer.
- Feedback non-modal (acuan POS): banner di bawah TopBar `showFeedback(msg, isError?)` + auto-hide 4s. Di dashboard boleh pola serupa (state error lokal + banner) — jangan import library toast (tidak ada).

### 3.5 `api/client.ts` — konvensi WAJIB
- GET → `fetchXxx`; mutasi → `xxxRequest`; semua return data ternormalisasi (bukan AxiosResponse); unwrap `{ success, data }`.
- Normalizer internal `toXxx(raw)` memetakan backend→frontend (opsional `?? null/''/false`). Tipe enum = union string literal; interface resource + interface payload input terpisah.
- Section komentar: `// ===== Users (Fase 2.1) =====` dst. JSDoc satu baris per fungsi berisi endpoint: `/** GET /api/users — daftar staf (admin). */`.
- Error: `catch {}` generik + pesan state (Inggris, ramah user); 401 jangan ditangani lokal (interceptor).
- FormData upload: panggil `api.post(url, formData)` **tanpa** set Content-Type manual (biar boundary otomatis).

### 3.6 State & storage
- `authStore`: `{ token, user: {id, username, name, role}, login, logout }` + rehydrate localStorage. `cartStore` terpisah. Akses localStorage hanya via konstanta client (`cafe_pos_token`, `cafe_pos_user`, `cafe_pos_sidebar_collapsed`, `cafe_pos_panel_collapsed`).

### 3.7 Deps & tooling
- Tersedia: react-router-dom 7, axios, zustand 5, cva, clsx, tailwind-merge, lucide-react (dipakai Icon.tsx), tailwindcss v4 + `@tailwindcss/vite`, vitest, oxlint.
- **TIDAK ada:** react-hook-form, zod, Radix Dialog, toast lib, tailwindcss-animate (kelas `animate-in` yang sudah ada kemungkinan no-op — jangan mengandalkannya).
- Scripts: `dev` (port **5174**), `build` = `tsc -b && vite build`, `lint` = oxlint, `test` = vitest.
- `vite.config.ts`: alias `@`→src; proxy `/api` → `http://localhost:3001`. **Fase 2 tambahkan** proxy `/uploads` → target sama.

## 4. Aturan Ponytail untuk Fase 2
1. **YAGNI:** tidak ada fitur di luar checklist Task 2.0–2.4 (tanpa pagination, tanpa soft-delete produk, tanpa rename channel, tanpa RBAC UI).
2. **KISS:** reuse pola yang ada — modul mengikuti `products`, halaman mengikuti `Login`/`Dashboard` + primitif `ui/*`, API mengikuti `client.ts`. **Nol abstraksi baru** (tanpa helper generik, tanpa layer repository, tanpa context provider baru).
3. **Duplikasi murah > abstraksi salah:** modal/form ditulis per halaman ala existing; jangan bikin `FormModal` generik.
4. **Tanpa fake data:** halaman hanya menampilkan data API nyata; empty state pakai `EmptyState`.
5. **Test dulu (TDD)** untuk semua service backend; frontend tidak wajib test baru (unit pure boleh via vitest jika memang ada logika).
6. **Batas file per task** — lihat kepemilikan di `docs/7_ROADMAP_TASKS.md` Fase 2: jangan sentuh `app.module.ts` (integrator Wave 2), `App.tsx`/`NavigationRail` (Task 2.0), atau section `client.ts` milik task lain.
