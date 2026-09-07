# 7. DELIVERY ROADMAP & IMPLEMENTATION TASKS (ROADMAP_TASKS.MD)

> **Dokumen Master Utama:** Rincian lengkap 31 bab spesifikasi teknis tersedia di [PRD_MASTER.md](file:///f:/Project/secondacc/docs/PRD_MASTER.md).
>
> **Protokol Eksekusi:**
> 1. Kerjakan **1 task atomic** dalam satu waktu.
> 2. Jalankan test otomatis (Superpowers TDD) sebelum mencentang `[x]`.
> 3. Lakukan git commit setelah setiap task selesai.

---

## 🟢 FASE 1: Core POS & Kasir (Fokus Utama / MVP)

### Milestone 1.1: Database Schema, Seeder & Financial Engine (Prisma + PostgreSQL + TDD)
- [x] **Task 1.1.1: Setup NestJS Architecture & Prisma ORM (`backend/`)**
  - Pastikan modul NestJS bersih dengan konfigurasi environment PostgreSQL `.env`.
  - Tulis `backend/prisma/schema.prisma` sesuai spesifikasi `docs/5_DATABASE.md`:
    - `User` (Role `ADMIN`, `CASHIER`).
    - `Category` (relasi ke products).
    - `Product` (`price` Integer Rupiah, `imageUrl`, `isAvailable`, `isRecommended`, `isBestSeller`).
    - `Order` (`invoiceNumber`, `orderType` enum `DINE_IN`/`TAKE_AWAY`, `customerName` String, `customerGender` Gender, `tableId` Int? nullable, `status` enum `OPEN_BILL`/`PAID`/`CANCELLED`, `subtotal` Int, `grandTotal` Int).
    - `OrderItem` (`quantity`, `unitPrice` Int, `subtotal` Int, `notes` String?).
    - `Payment` (`category` enum `CASH`/`THIRD_PARTY`/`EDC`, `methodName`, `amountPaid` Int, `changeDue` Int).
    - `PaymentChannel` & `Table`.
  - Eksekusi `npx prisma generate` dan push database (`npx prisma db push`).
- [x] **Task 1.1.2: Database Seeder Realistis (`backend/prisma/seed.ts`)**
  - Akun Awal: 1 Admin (`admin` / `admin123`) dan 1 Kasir (`siti` / `kasir123`) dengan bcrypt hashing.
  - 5 Kategori Kafe: `Coffee`, `Mocktails`, `Non-Coffee`, `Main Course`, `Pastry & Snacks`.
  - 16 Produk Realistis dengan foto, harga Rupiah, serta flag `isRecommended` dan `isBestSeller`.
  - Channel Pembayaran: Tunai (Cash), QRIS BCA, EDC Mandiri.
  - Verifikasi seeder dengan `npx prisma db seed`.
- [x] **Task 1.1.3: Superpowers TDD - Financial & Checkout Engine (`backend/src/orders/financial.calculator.*`)**
  - Tulis Unit Test `financial.calculator.spec.ts` sebelum kode:
    - Test kalkulasi subtotal item ($qty \times price$) dengan integer precision.
    - Test grand total order.
    - Test kalkulasi kembalian tunai ($amountPaid - grandTotal \ge 0$).
    - Test proteksi jika nominal bayar kurang ($amountPaid < grandTotal$ melempar error).
    - Test proteksi floating point (`0.1 + 0.2` tidak boleh terjadi di kalkulasi uang).
  - Tulis implementasi murni di `financial.calculator.ts` hingga semua test lulus 100%.

### Milestone 1.2: Core Backend REST APIs (NestJS)
- [x] **Task 1.2.1: Auth Module & JWT Guard (`backend/src/auth`)**
  - Endpoint `POST /api/auth/login` (validasi bcrypt, kembalikan JWT token, nama, dan role `ADMIN`/`CASHIER`).
  - Implementasikan `JwtAuthGuard` dan `RolesGuard`.
  - Unit test `auth.service.spec.ts` (skenario login sukses, password salah, user tidak aktif).
- [x] **Task 1.2.2: Products & Catalog API (`backend/src/products`)**
  - Endpoint `GET /api/products` (filter `categoryId`, `search`, `isAvailable`, `isRecommended`, `isBestSeller`).
  - Endpoint `PATCH /api/products/:id/toggle-availability` (1-tap toggle status Tersedia / Sold Out).
  - Unit test `products.service.spec.ts`.
- [x] **Task 1.2.3: Categories API (`backend/src/categories`)**
  - Endpoint `GET /api/categories` (mengembalikan daftar kategori dengan jumlah produk aktif).
- [x] **Task 1.2.4: Orders, Open Bill, & Checkout API dengan ACID Transaction (`backend/src/orders`)**
  - Generator sequence Order ID harian (`Order #001`, `#002`, dst) & Invoice Number (`INV-YYYYMMDD-XXXX`).
  - Endpoint `POST /api/orders/open-bill` (Prisma `$transaction`: buat Order + OrderItems, status = `OPEN_BILL`, `customerName` wajib, `orderType`).
  - Endpoint `GET /api/orders/active` (mengambil seluruh pesanan aktif berstatus `OPEN_BILL` untuk Active Orders Line).
  - Endpoint `POST /api/orders/:id/checkout` (Prisma `$transaction`: validasi order, simpan payment tunai/QRIS/EDC, rekam demografi gender pembayar, ubah status order menjadi `PAID`). Rollback total jika ada langkah gagal.
  - Endpoint `GET /api/orders/history` (mengambil daftar transaksi selesai `PAID` dengan filter tanggal & search invoice/nama untuk Order History drawer).
  - Unit test `orders.service.spec.ts` memverifikasi integritas transaksi ACID dan kalkulasi finansial.

### Milestone 1.3: Frontend Foundation & POS Screen (Vite + React + Tailwind + Lucide)
- [x] **Task 1.3.1: Setup Frontend Foundation & Axios Interceptors (`frontend/`)**
  - Pastikan Vite + React + TypeScript + Tailwind CSS + Lucide React terkonfigurasi.
  - Setup Axios client dengan interceptor JWT token dan redirect otomatis jika token kadaluarsa.
  - Setup Global State / Cart Store untuk mengelola item keranjang kasir.
- [ ] **Task 1.3.2: Layar Login & Role Redirection (`/login`)**
  - Form login modern minimalis dengan proteksi autentikasi.
  - Role Redirection: Kasir otomatis masuk ke `/pos`, Admin masuk ke `/dashboard`.
- [ ] **Task 1.3.3: Zone 1 - Slim Left Navigation Rail (`~64px` / `56px`)**
  - Logo kafe di bagian atas.
  - Ikon Navigasi:
    - `[ 🏪 Register / POS ]` (Halaman aktif kasir).
    - `[ 🧾 Order History ]` (Membuka Slide-Over Drawer riwayat transaksi selesai & reprint struk tanpa unmount layar kasir).
  - Avatar Kasir di bawah (`👤 Siti`) dengan popover: Info login kasir, lock register, dan Sign Out (logout).
- [ ] **Task 1.3.4: Zone 2 - Top Section: Persistent Active Orders Line**
  - Header: Judul `Active Orders (count)` dan kolom pencarian `[ 🔍 Search orders ]` (by Order ID atau nama pelanggan).
  - Filter Pills tepat di bawah judul: `[ All ]`, `[ Dine In ]`, `[ Takeaway ]`.
  - Carousel horizontal 1-baris dengan navigasi panah `<` `>`.
  - Kartu Pesanan Aktif: Order ID (`Order #045`), Badge tipe pesanan, Nama pelanggan, Total item & total Rupiah.
  - Interaksi 1-Klik: Klik kartu langsung memuat pesanan ke panel kanan (Order Details).
- [ ] **Task 1.3.5: Zone 2 - Middle Section: Category Filter Bar & Overflow Handling**
  - Carousel horizontal 1-baris tanpa wrap (tinggi tetap `~42px`) dengan kontrol panah `<` `>`.
  - Tombol Pill Kategori: Teks bersih tanpa emoji umum (`[ All ]`, `[ Recommended ⭐ ]`, `[ Best Seller 🔥 ]`, `[ Coffee ]`, `[ Mocktails ]`, `[ Non-Coffee ]`, `[ Main Course ]`, `[ Snacks & Pastry ]`).
  - Tombol Popover Grid `[ 📑 Categories ▼ ]` di ujung baris: Membuka popover 3 kolom untuk melompat langsung ke kategori mana pun dalam 1 klik.
  - Kolom live search produk dengan shortcut keyboard `/`.
- [ ] **Task 1.3.6: Zone 2 - Bottom Section: Menu Catalog Grid with Category Section Headers**
  - Saat tab `[ All ]` aktif: Menampilkan produk terkelompok rapi dengan **Header Section yang jelas** (`⭐ RECOMMENDED & BEST SELLER`, `COFFEE`, `MOCKTAILS`, dll) disertai divider garis halus.
  - Saat tab kategori spesifik aktif: Menampilkan grid terfokus kategori tersebut.
  - Kartu Produk: Foto rasio $1:1$, judul menu, harga integer Rupiah, badge eksklusif `[ ⭐ Recommended ]` / `[ 🔥 Best Seller ]`, dan badge status *Sold Out* (grayscale overlay).
  - Klik kartu produk membuka Guided Item Customization Modal.
- [ ] **Task 1.3.7: Guided Item Customization Modal (Pop-up Terpandu)**
  - Muncul otomatis saat kasir klik kartu menu apa saja.
  - Stepper kuantitas `-` / `+` (default 1).
  - Opsi dinamis:
    - Minuman: Chip level gula (`Less`, `Normal`, `No`), chip level es (`Less`, `Normal`, `No`).
    - Makanan: Chip level pedas (`Tidak Pedas`, `Sedang`, `Pedas`), chip catatan cepat (`Pisah Sambal`, `Tanpa Bawang`).
  - Textarea catatan dapur bebas (free-form kitchen notes).
  - Tombol aksi: `[ Add to Order • Rp XX,XXX (Enter ↵) ]` yang mengkalkulasi total dinamis secara real-time. Keyboard shortcut `Enter` untuk tambah, `Esc` untuk batal.
- [ ] **Task 1.3.8: Zone 3 - Right Order Details Panel (`~380px` / `320px`)**
  - Header: Nomor Tiket Harian (`Order #045`) dan tanggal/jam.
  - Tombol Reset: Indikator `Viewing Order #042 (Open Bill)` dengan tombol **`[ ✕ New Order ]`** untuk kembali ke pesanan baru saat sedang membuka tiket lama.
  - Segmented toggle: **`[ Dine In ]`** vs **`[ Takeaway ]`**.
  - Input Nama Pelanggan (`Customer Name`): **Wajib diisi (Mandatory)**, validasi mencegah simpan jika kosong.
  - Daftar item keranjang: foto kecil, nama, kuantiti stepper `-` / `+`, catatan khusus, dan tombol hapus (`Trash`).
  - Quick Demographics Gender Selector (1-klik): **`[ 👨 Male (L) ]`** dan **`[ 👩 Female (P) ]`** (mencatat profil pembayar).
  - Ringkasan Finansial: Subtotal dan Grand Total rupiah bulat.
  - Tombol Aksi Terpadu:
    - Utama (Solid): **`[ Pay Now • Rp XX,XXX → ]`**.
    - Sekunder (Outline): **`[ Save Open Bill ]`** (masuk ke Active Orders Line).
- [ ] **Task 1.3.9: Fast Checkout & Payment Modal (Eksekusi ACID)**
  - Pilihan metode: Tunai (Cash), QRIS, EDC.
  - Mode Tunai: Tombol nominal cepat (Uang Pas, 20k, 50k, 100k) + kalkulasi otomatis uang kembalian (*change due*).
  - Eksekusi transaksi checkout ke backend: Order berstatus `PAID` otomatis terhapus dari Active Orders line dan panel keranjang kembali bersih.
- [ ] **Task 1.3.10: Slide-Over Drawer: Order History & 1-Tap Reprint Receipt**
  - Dibuka via ikon `[ 🧾 Order History ]` pada rel navigasi kiri tanpa me-reload halaman kasir atau menghapus keranjang yang sedang diketik.
  - Fitur: Search by invoice / nama pelanggan, filter tanggal (Today, Yesterday).
  - Tabel transaksi selesai (`status = PAID`) dengan detail metode bayar.
  - Tombol **`[ 🖨️ Reprint Receipt ]`**: Membuka preview struk dan langsung memicu cetak printer thermal via `window.print()` dengan isolasi CSS 58mm/80mm.
- [ ] **Task 1.3.11: Verifikasi Responsivitas & Ergonomi Sentuh**
  - Verifikasi tampilan pada Desktop AIO (4 kolom grid, 3 zona berdampingan).
  - Verifikasi tampilan pada Tablet Landscape (3 kolom grid, 3 zona berdampingan tanpa panel tersembunyi).
  - Verifikasi tampilan pada Tablet Portrait (3 kolom grid + floating bottom cart dock).
  - Verifikasi area sentuh tombol (*touch targets*) $\ge 44 \times 44\text{px}$.

---

## 🟡 FASE 2: Manajemen Akun & Pengaturan Sistem

- [ ] **Task 2.1: Manajemen Akun Staf (`/dashboard/account`)**
  - Backend API CRUD user (Role: CASHIER & ADMIN, hash password bcrypt, toggle status aktif).
  - Frontend UI tabel staf: Tambah akun, ganti password, toggle aktif/disable.
- [ ] **Task 2.2: Manajemen Menu & Upload Gambar Lokal (`/dashboard/menu`)**
  - Backend: Konfigurasi Multer untuk penyimpanan disk gambar ke `./uploads/products` dan sajikan static assets di `app.module.ts`.
  - Backend: Buat endpoint `POST /api/products` (dengan file upload), `PUT /api/products/:id`, dan `DELETE /api/products/:id`.
  - Frontend UI Admin: Tambah menu baru, ubah harga, upload foto, toggle status Tersedia/Sold Out.
- [ ] **Task 2.3: Pengaturan Channel Pembayaran (`/dashboard/payment`)**
  - Pengaturan daftar channel aktif (Cash, QRIS BCA/GoPay, EDC Mandiri/BCA).

---

## 🔵 FASE 3: Dashboard Analitik & Target Omset

- [ ] **Task 3.1: Backend Dashboard Aggregation Service**
  - Endpoint `GET /api/dashboard/overview` menghitung: Pie gender P/L, Bar omset 7 hari, Best seller menu, dan progress bar target (Merah/Kuning/Hijau).
- [ ] **Task 3.2: Tampilan Dashboard 4 Grid (`/dashboard`)**
  - Grid 1: Pie Chart Recharts (Gender P vs L bulanan).
  - Grid 2: Bar Chart Recharts (Grafik omset harian & filter 7 hari).
  - Grid 3: List peringkat menu Best Seller.
  - Grid 4: Visual Progress Bar Target Omset (🔴 Merah < Target, 🟡 Kuning = Target, 🟢 Hijau > Target).
- [ ] **Task 3.3: Halaman Setting Target Omset (`/dashboard/target`)**
  - Form input target nominal per bulan (disimpan ke tabel `monthly_targets`).
- [ ] **Task 3.4: Halaman Riwayat & Laporan (`/dashboard/history`)**
  - Filter tabel: Rentang tanggal, nama produk, dan gender (P/L).
  - Fitur Export data ke CSV/Excel.
  - Fitur lihat struk digital & cetak ulang (*reprint receipt*).

---

## 🟣 FASE 4: QR Barcode Meja Pelanggan

- [ ] **Task 4.1: Generator QR Code Meja di Admin**
  - Tombol unduh/cetak stiker QR Code untuk setiap nomor meja kafe.
- [ ] **Task 4.2: Halaman Publik Menu Digital (`/menu?table=X`)**
  - Halaman web responsif HP (tampilan mobile-first, view-only) untuk pelanggan melihat katalog menu dan harga secara mandiri saat duduk di meja.
