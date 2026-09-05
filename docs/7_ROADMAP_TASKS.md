# 7. DELIVERY ROADMAP & IMPLEMENTATION TASKS (ROADMAP_TASKS.MD)

> **Protokol Eksekusi:**
> 1. Kerjakan **1 task atomic** dalam satu waktu.
> 2. Jalankan test otomatis (Superpowers) sebelum mencentang `[x]`.
> 3. Lakukan git commit setelah setiap task selesai.

---

## 🟢 FASE 1: Core POS & Kasir (Fokus Utama / MVP)

### Milestone 1.1: Backend Foundation & Database (NestJS + PostgreSQL + Prisma)
- [x] **Task 1.1.1: Setup Proyek NestJS di `backend/`**
  - Inisialisasi NestJS dengan TypeScript, ESLint, dan Prettier.
  - Konfigurasi environment `.env` untuk PostgreSQL.
- [x] **Task 1.1.2: Setup Prisma ORM & Database Migration**
  - Buat `prisma/schema.prisma` sesuai spesifikasi `docs/5_DATABASE.md`.
  - Jalankan migrasi database awal (`npx prisma migrate dev` / `prisma generate`).
- [x] **Task 1.1.3: Database Seeder Awal**
  - Buat seed script: 1 Admin, 1 Kasir, 4 Kategori (Kopi, Non-Kopi, Makanan Berat, Snack), 15 Menu sampel (dengan flag `isAvailable`), dan 10 Meja kafe.
- [x] **Task 1.1.4: Superpowers TDD - Financial & Checkout Logic**
  - Unit test kalkulasi keranjang, subtotal, validasi uang bayar $\ge$ total, dan hitung uang kembalian.

### Milestone 1.2: Core Backend APIs
- [x] **Task 1.2.1: Auth Module & JWT Guard**
  - Endpoint `POST /api/auth/login` (kembalikan JWT token + role).
- [x] **Task 1.2.2: Tables & Menu API**
  - Endpoint `GET /api/tables` (status terisi & info open bill).
  - Endpoint `GET /api/products` (filter kategori & search).
  - Endpoint `PATCH /api/products/:id/toggle-availability` (Tersedia / Sold Out).
- [x] **Task 1.2.3: Order, Open Bill & Checkout API (ACID Transaction)**
  - Endpoint `POST /api/orders/open-bill` (simpan pesanan meja, set status meja = `isOccupied`).
  - Endpoint `POST /api/orders/:id/checkout` (rekam gender P/L, simpan pembayaran, ubah status order = `PAID`, kosongkan meja).

### Milestone 1.3: Frontend Foundation & POS Screen (Vite + React + Tailwind + Shadcn)
- [x] **Task 1.3.1: Setup Proyek `frontend/`**
  - Inisialisasi Vite + React + TypeScript + Tailwind CSS + Lucide Icons + Shadcn UI.
  - Setup Axios client dengan interceptor JWT token.
- [x] **Task 1.3.2: Layar Login & Role Redirection**
  - Halaman `/login` responsif: Kasir otomatis diarahkan ke `/pos`, Admin ke `/dashboard`.
- [x] **Task 1.3.3: Layar Kasir POS (`/pos`) - Layout 2 Kolom**
  - Kolom Kiri: Katalog menu dengan tab kategori, live search, dan badge *Sold Out*.
  - Kolom Kanan: Pemilih nomor meja, keranjang belanja dinamis (tambah, kurangi kuantiti, catatan menu).
- [ ] **Task 1.3.4: Aksi Open Bill di Layar Kasir**
  - Tombol **Open Bill**: simpan pesanan meja ke backend, keranjang reset otomatis.
  - Indikator meja terisi (kasir bisa klik meja terisi untuk membuka kembali pesanan).
- [ ] **Task 1.3.5: Modal Pembayaran & Input Demografi Gender (P / L)**
  - Tombol cepat **`[ 👨 Laki-laki ]`** dan **`[ 👩 Perempuan ]`**.
  - Pilihan metode: Tunai (tombol uang pas, 20k, 50k, 100k + auto kembalian), QRIS/Third-party, EDC.
  - Selesaikan transaksi & kosongkan meja.
- [ ] **Task 1.3.6: Pratinjau & Cetak Struk Belanja**
  - Modal struk digital setelah transaksi sukses + tombol cetak (`window.print()`).

---

## 🟡 FASE 2: Manajemen Akun & Pengaturan Sistem

- [ ] **Task 2.1: Manajemen Akun Staf (`/dashboard/account`)**
  - Backend API CRUD user (Role: CASHIER & INVENTORY).
  - Frontend UI tabel staf: Tambah akun, ganti password, toggle aktif/disable.
- [ ] **Task 2.2: Manajemen Menu & Harga (`/dashboard/menu`)**
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
  - Halaman web responsif HP (tampilan mobile-first) untuk pelanggan melihat katalog menu dan harga secara mandiri saat duduk di meja.
