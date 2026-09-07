# PRODUCT REQUIREMENT DOCUMENT (PRD) & SPESIFIKASI TEKNIS
## Cafe POS & Management System (Full Lifecycle: Fase 1 - 4)

---

## 1. Project Overview
**Cafe POS & Management System** adalah sistem kasir Point of Sale (POS) dan manajemen kafe modern berbasis web. Sistem ini dirancang untuk mempercepat transaksi di meja kasir dengan latensi minimum (0 delay), mendukung penyimpanan pesanan fleksibel (**Open Bill** untuk pelanggan yang sedang dine-in), pencatatan demografi pelanggan (**Gender P / L**) dalam 1 klik, dashboard visual performa omset 4-grid terhadap target bulanan, manajemen staf & master menu mandiri, serta katalog menu digital publik berbasis **QR Code Meja**.

---

## 2. Problem Statement
1. **Antrean Kasir Lambat & Rawan Human-Error:** Proses checkout kafe konvensional seringkali lambat karena kasir harus berpindah-pindah menu atau melakukan perhitungan manual kembalian dan diskon.
2. **Keterbatasan Pengelolaan Meja Nongkrong (Open Bill):** Kafe sering kedatangan tamu yang memesan bertahap (open bill) sebelum membayar saat hendak pulang. Tanpa sistem open bill terstruktur, nota kertas tercecer dan status ketersediaan meja tidak terdata akurat.
3. **Ketiadaan Data Demografi Pelanggan:** Pemilik kafe kesulitan mengetahui profil pelanggan utama (apakah dominan perempuan atau laki-laki) untuk merancang promo dan stok menu yang tepat sasaran.
4. **Monitoring Target Penjualan Tidak Real-Time:** Owner seringkali baru mengetahui apakah target omset bulanan tercapai pada akhir bulan melalui rekap manual di spreadsheet, tanpa indikator visual harian yang proaktif.
5. **Katalog Menu Fisik Usang & Biaya Cetak:** Mengganti harga atau mencoret menu habis pada buku menu fisik memakan biaya dan terlihat tidak profesional bagi pelanggan.

---

## 3. Product Goals
1. **Transaksi Kasir Instan:** Menghadirkan alur transaksi kasir (Katalog $\rightarrow$ Keranjang $\rightarrow$ Pembayaran $\rightarrow$ Cetak Struk) selesai dalam waktu $< 15$ detik.
2. **Akurasi Finansial 100% (Zero Floating-Point Error):** Semua kalkulasi uang menggunakan tipe data `Integer` (rupiah bulat), dieksekusi dalam **Database Transaction (ACID)** yang atomik.
3. **Analitik Demografi & Visualisasi Target:** Menyediakan 4-grid dashboard analitik real-time yang memvisualisasikan rasio gender pelanggan (P vs L), tren omset 7 hari terakhir, menu best seller, dan indikator warna progress target omset (Merah, Kuning, Hijau).
4. **Self-Service Menu Browsing via QR Meja:** Pelanggan dapat memindai QR code di setiap meja menggunakan kamera HP untuk melihat katalog menu dan harga terkini secara instan tanpa perlu memasang aplikasi.

---

## 4. Target Users
1. **Kasir (Cashier):**
   - Fokus: Kecepatan transaksi, kemudahan navigasi katalog menu, input pesanan meja, split/open bill, pemilihan gender pelanggan dengan 1 klik, dan cetak struk cepat.
   - Hak Akses: Layar POS Kasir (`/pos`), Pesanan Aktif, Riwayat Transaksi Shift Kasir.
2. **Admin / Owner:**
   - Fokus: Pengawasan menyeluruh atas operasional kafe, pemantauan omset dan target bulanan, pengelolaan akun staf kasir, update master harga & stok menu, serta laporan penjualan.
   - Hak Akses: Seluruh modul sistem termasuk Dashboard Analitik (`/dashboard`), Manajemen Akun (`/dashboard/account`), Manajemen Menu (`/dashboard/menu`), Channel Pembayaran (`/dashboard/payment`), Target Omset (`/dashboard/target`), Riwayat & Laporan (`/dashboard/history`), dan Generator QR Meja.
3. **Pelanggan Kafe (Customer):**
   - Fokus: Kemudahan melihat foto menu, deskripsi, dan harga makanan/minuman langsung dari browser HP saat duduk di meja.
   - Hak Akses: Halaman publik `/menu?table=X` (view-only).

---

## 5. Application Scope
- **Tipe Delivery:** Fully Functional Web Application (Bukan prototype/mockup).
- **Arsitektur:** Monorepo Client-Server (Frontend SPA React + Backend REST API NestJS + Database Relasional PostgreSQL).
- **Cakupan Fase:**
  - **Fase 1 (Core POS & Kasir):** Autentikasi, Master Data Awal, Manajemen Meja, POS Screen, Open Bill, Checkout & Gender P/L, Struk Belanja (`window.print`).
  - **Fase 2 (Manajemen Akun & Pengaturan Sistem):** CRUD Staf Kasir, CRUD Menu & Upload Foto Lokal, Konfigurasi Channel Pembayaran.
  - **Fase 3 (Dashboard Analitik & Target Omset):** 4-Grid Dashboard, Form Target Omset, Riwayat Transaksi, Filter Multi-Parameter, Export CSV.
  - **Fase 4 (QR Barcode Meja Pelanggan):** Generator QR Code Meja (cetak stiker meja), Halaman Publik Menu Digital Mobile-First (`/menu?table=X`).

---

## 6. Platform
- **Frontend Utama (Kasir & Admin):** Web SPA responsif dioptimalkan untuk Desktop & Tablet (Resolusi minimum 1024x768).
- **Halaman Menu Pelanggan:** Web responsif mobile-first dioptimalkan untuk smartphone (layar 360px - 430px) via browser mobile (Chrome, Safari).
- **Backend:** Node.js (NestJS) REST API server.
- **Database:** PostgreSQL.

---

## 7. User Roles & Permissions
Sistem menerapkan **Role-Based Access Control (RBAC)** ketat di level backend guard:

| Modul / Fitur | ADMIN | CASHIER | PUBLIC / CUSTOMER |
|---|:---:|:---:|:---:|
| Login Akun (`/login`) | ✅ | ✅ | ❌ |
| Layar POS Transaksi (`/pos`) | ✅ | ✅ | ❌ |
| Simpan & Buka Open Bill | ✅ | ✅ | ❌ |
| Proses Checkout & Input Gender | ✅ | ✅ | ❌ |
| Cetak Struk Transaksi | ✅ | ✅ | ❌ |
| Lihat Dashboard Analitik 4-Grid (`/dashboard`) | ✅ | ❌ | ❌ |
| CRUD Akun Staf (`/dashboard/account`) | ✅ | ❌ | ❌ |
| CRUD Master Menu & Upload Foto (`/dashboard/menu`) | ✅ | ❌ | ❌ |
| Pengaturan Channel Bayar (`/dashboard/payment`) | ✅ | ❌ | ❌ |
| Pengaturan Target Omset (`/dashboard/target`) | ✅ | ❌ | ❌ |
| Laporan & Export CSV (`/dashboard/history`) | ✅ | ❌ | ❌ |
| Download QR Code Meja (`/dashboard/tables`) | ✅ | ❌ | ❌ |
| Akses Menu Digital Meja (`/menu?table=X`) | ✅ | ✅ | ✅ (Tanpa Login) |

---

## 8. Functional Requirements

#### 8.1 Fase 1: Core POS & Kasir (Fokus Utama / MVP)
- **FR-1.1 Slim Left Navigation Rail (~64px) & Manajemen Sesi Kasir:**
  - Navigasi ikon vertikal minimalis di sisi paling kiri:
    - Logo Brand Kafe.
    - Ikon `[ 🏪 Register / POS ]` (Layar transaksi kasir aktif).
    - Ikon `[ 🧾 Order History ]` (Memicu Slide-Over Drawer riwayat transaksi selesai dan cetak ulang struk).
    - Avatar Kasir & Shift Widget di bagian bawah: Klik memicu dropdown (Info Shift, Switch Kasir, Ganti Password, dan Logout Sesi JWT).
- **FR-1.2 Active Orders Queue (Orders Line - Persisted & Searchable):**
  - Terletak tepat di atas katalog menu pada kolom tengah dan **bersifat persisted** (tidak pernah ter-reset saat kasir berganti kategori atau mencari menu).
  - **Filter Chips Aktif:** `[ All Active ]`, `[ Open Bill ]` (Dine In Meja), `[ Take Away ]`, dan `[ Waitlist ]` (Antrean tamu/meja).
  - **Search Bar Orders Line:** Pencarian instan pesanan aktif berdasarkan nomor meja (e.g. "Table 03") atau nama tamu (e.g. "Rian").
  - **Navigasi Carousel:** Tombol panah `<` `>` dan kartu pesanan kompak (Invoice ID, Table/Take Away/Waitlist badge, Customer Name, Items count, Subtotal, Status badge).
  - **1-Click Load:** Klik kartu langsung memuat seluruh pesanan ke panel kanan (*Order Details*).
- **FR-1.3 Horizontal Category Bubbles & Menu Catalog Grid:**
  - **Category Bubbles:** Tombol pill horizontal tepat di atas grid produk: `[ All ]`, `[ Coffee ]`, `[ Non-Coffee ]`, `[ Main Course ]`, `[ Snacks & Pastry ]`.
  - **Search Bar Menu:** Kolom live search pencarian nama menu makanan/minuman di sisi kanan bar kategori.
  - **Grid Menu Produk (3–4 Kolom):** Kartu modern berfoto tajam, nama menu, harga Rupiah bulat, badge *Sold Out*, tombol `[ + Add Item ]` atau inline stepper `[-] [ Qty ] [+]`.
  - **Modal Cepat Kustomisasi Catatan:** Pratinjau foto, kuantiti `-`/`+`, chips preset 1-klik (`[Less Sugar]`, `[Normal Sugar]`, `[Less Ice]`, `[No Ice]`, `[Spicy]`, `[Not Spicy]`, `[Separate Sauce]`), dan kolom input catatan teks bebas (free-form notes).
- **FR-1.4 Panel Order Details & Checkout Kanan (~380px):**
  - Header: Nomor Invoice dan tanggal/waktu transaksi.
  - Segmented buttons: **`[ Dine In ]`** dan **`[ Take Away ]`**.
  - Input Nama Pelanggan (`Customer Name`).
  - Dropdown Pemilih Meja: Memilih nomor meja kafe (`Table 01` - `Table 10`). Bersifat opsional/fleksibel (**bisa dikosongkan**) jika tamu baru datang di kasir dan belum menentukan meja duduk. Jika Take Away, nomor meja otomatis disembunyikan.
  - Daftar Item: Nama menu, kuantiti inline stepper, harga, catatan kustom di bawah nama menu, dan tombol hapus item.
  - Quick Gender Selector: Tombol 1-klik **`[ 👨 Male (L) ]`** dan **`[ 👩 Female (P) ]`**.
  - Ringkasan Finansial: Subtotal dan Grand Total terhitung otomatis (integer Rupiah).
  - **Tombol Aksi Terpadu:**
    - Tombol Utama Solid: **`[ Pay Now • Rp XX,XXX → ]`** (Membuka modal pembayaran tunai/QRIS/EDC dengan nominal terpadu).
    - Tombol Sekunder Outline: **`[ Save Open Bill ]`** (Menyimpan pesanan meja nongkrong & reset keranjang kasir).
- **FR-1.5 Slide-Over Drawer: Order History & 1-Tap Reprint Receipt:**
  - Terbuka dari sisi kanan layar tanpa meninggalkan layar kasir saat ikon `[ Order History ]` diklik.
  - Menampilkan daftar transaksi yang telah selesai dibayar (`status = PAID`) dengan search filter dan tombol `[ Reprint Receipt ]` (`window.print()`).
- **FR-1.6 Transaksi Atomik (ACID) & Cetak Struk Thermal:** Eksekusi database transaction untuk update order `PAID`, rekam payment & gender, serta kosongkan meja (`isOccupied = false` jika memiliki tableId). Format struk ramah printer thermal 58mm/80mm.

### 8.2 Fase 2: Manajemen Akun & Pengaturan Sistem
- **FR-2.1 CRUD Akun Staf (`/dashboard/account`):**
  - Admin dapat menambahkan akun staf kasir baru (Nama Lengkap, Username unik, Password awal, Role: `CASHIER`).
  - Admin dapat mengubah password kasir.
  - Admin dapat menonaktifkan/mengaktifkan status akun staf (`isActive = true/false`) tanpa menghapus riwayat audit transaksi.
- **FR-2.2 Manajemen Menu & Harga (`/dashboard/menu`):**
  - Admin dapat menambah, mengubah, dan menghapus menu makanan/minuman.
  - Form menu mencakup: Nama menu, Kategori, Harga (Rupiah), Deskripsi, dan Foto Produk.
  - **Upload Foto Produk:** Gambar diunggah langsung ke backend NestJS via `multipart/form-data`, disimpan pada direktori lokal server (`uploads/products/`), dan disajikan sebagai static asset publik (`/uploads/products/:filename`).
  - Toggle cepat ketersediaan stok menu (*Tersedia* / *Sold Out*) langsung dari tabel admin.
- **FR-2.3 Pengaturan Channel Pembayaran (`/dashboard/payment`):**
  - Admin dapat mengelola daftar metode pembayaran aktif di kasir:
    - Tunai (Cash).
    - QRIS (BCA, GoPay, ShopeePay, Dana, dll).
    - EDC / Kartu (BCA, Mandiri, BRI, dll).
  - Admin dapat menambah channel baru atau menonaktifkan channel yang sedang bermasalah/offline.

### 8.3 Fase 3: Dashboard Analitik & Target Omset
- **FR-3.1 Dashboard Analitik 4-Grid (`/dashboard`):**
  - **Grid 1 (Pie Chart):** Komposisi gender pelanggan bulanan (Perempuan vs Laki-laki) beserta persentasenya.
  - **Grid 2 (Bar Chart):** Total omset berjalan bulan ini dan grafik tren pendapatan 7 hari terakhir.
  - **Grid 3 (Leaderboard Best Seller):** Daftar 5 menu paling laris berdasarkan kuantiti terjual dalam bulan berjalan.
  - **Grid 4 (Target Omset Progress Bar):** Visual bar capaian penjualan terhadap target nominal bulan ini:
    - 🔴 **Merah:** Capaian $< 70\%$ dari target.
    - 🟡 **Kuning:** Capaian $70\% - 99\%$ dari target.
    - 🟢 **Hijau:** Capaian $\ge 100\%$ (Target Tercapai / Terlampaui).
- **FR-3.2 Manajemen Target Omset (`/dashboard/target`):**
  - Form pengaturan nominal target omset per bulan dan tahun.
  - Riwayat target bulan-bulan sebelumnya beserta status pencapaian.
- **FR-3.3 Riwayat Transaksi & Export Laporan (`/dashboard/history`):**
  - Tabel transaksi lengkap dengan fitur pencarian invoice, filter rentang tanggal, filter metode bayar, dan filter gender pelanggan.
  - Fitur **Cetak Ulang Struk (Reprint Receipt)** dari riwayat transaksi lama.
  - Fitur **Export CSV / Excel:** Mengunduh rekapitulasi data penjualan sesuai filter yang aktif.

### 8.4 Fase 4: QR Barcode Meja & Menu Digital
- **FR-4.1 Generator QR Code Meja (`/dashboard/tables`):**
  - Admin dapat melihat daftar seluruh meja kafe beserta QR code uniknya.
  - Fitur download gambar QR code atau cetak stiker meja langsung.
- **FR-4.2 Halaman Publik Menu Digital (`/menu?table=X`):**
  - Pelanggan yang memindai QR code di meja otomatis membuka halaman katalog menu di browser HP mereka.
  - Menampilkan nama meja, kategori menu, foto produk, harga, dan label *Sold Out* secara real-time.
  - Alur **View-Only**: Pesanan tetap dicatat oleh kasir atau pelayan di kasir POS untuk menjaga alur operasional kafe tetap terkontrol.

---

## 9. Feature Priority

| Prioritas | Kode Fitur | Deskripsi Fitur | Fase | Status |
|:---:|:---:|---|:---:|:---:|
| **P0** | FR-1.1 - FR-1.6 | Core POS, Meja, Open Bill, Checkout, Gender P/L, Struk | Fase 1 | Selesai |
| **P0** | FR-2.1 | CRUD Akun Staf Kasir & Keamanan Password | Fase 2 | Siap Dikerjakan |
| **P0** | FR-2.2 | CRUD Master Menu, Update Harga & Upload Foto Lokal | Fase 2 | Siap Dikerjakan |
| **P0** | FR-3.1 | Dashboard Analitik 4-Grid (Pie, Bar, Best Seller, Progress) | Fase 3 | Siap Dikerjakan |
| **P0** | FR-3.2 | Pengaturan Target Omset Bulanan | Fase 3 | Siap Dikerjakan |
| **P1** | FR-2.3 | Manajemen Channel Pembayaran (Cash/QRIS/EDC) | Fase 2 | Siap Dikerjakan |
| **P1** | FR-3.3 | Riwayat Transaksi Lanjutan & Export CSV | Fase 3 | Siap Dikerjakan |
| **P1** | FR-4.1 | Generator & Cetak Stiker QR Code Meja | Fase 4 | Siap Dikerjakan |
| **P1** | FR-4.2 | Menu Digital Pelanggan Responsif HP (`/menu?table=X`) | Fase 4 | Siap Dikerjakan |

---

## 10. User Flows

### Flow 1: Navigasi Login Berdasarkan Role
```
Pengguna Membuka Web (/login) ───> Autentikasi Kredensial JWT
   ├── Role CASHIER ───> Langsung diarahkan ke Layar POS (/pos)
   └── Role ADMIN   ───> Diarahkan ke Dashboard Analitik (/dashboard)
```

### Flow 2: Pemilihan Menu & Kustomisasi Catatan Cepat
```
Kasir Memilih Menu Tersedia di Katalog
   │
   ▼
Muncul Modal Cepat Kustomisasi (Pratinjau Foto, Nama & Harga)
   │
   ├── [Opsi] Klik Chip Preset: [Less Sugar], [Less Ice], [Pedas], dll.
   ├── [Opsi] Ketik Catatan Tambahan Bebas (Free-form Notes)
   └── Atur Kuantiti (+ / -)
   │
   ▼
Tekan [Tambah ke Keranjang] (atau tekan keyboard Enter)
   │
   ▼
Item & Catatan Khusus Masuk ke Panel Order Detail
```

### Flow 3: Akses Cepat Recent Orders (Open Bill & Reprint Struk)
```
Kasir Mengakses Panel Recent Orders di Layar POS
   │
   ├── TAB OPEN BILL AKTIF:
   │   - Melihat daftar meja nongkrong (No Meja, Nama Tamu, Waktu, Subtotal)
   │   - Klik 1x kartu meja ───> Seluruh pesanan dimuat ke Panel Order Detail
   │   - Kasir dapat langsung menambah menu baru atau memproses pembayaran
   │
   └── TAB RECENT PAID (Riwayat Selesai):
       - Melihat 5 transaksi terakhir yang telah dibayar
       - Klik 1x kartu transaksi ───> Modal struk digital terbuka
       - Kasir dapat mencetak ulang struk pelanggan (window.print())
```

### Flow 4: Alur Checkout & Pembayaran Atomik (ACID)
```
Panel Order Detail Lengkap ───> Pilih Gender Pelanggan [ 👨 L / 👩 P ]
   │
   ▼
Klik [Bayar Sekarang] ───> Buka Modal Pembayaran
   │
   ├── Tunai: Input nominal uang / tombol cepat (20k, 50k, 100k, pas) ───> Kalkulasi kembalian otomatis
   └── Non-Tunai: Pilih QRIS atau EDC
   │
   ▼
Klik [Selesaikan Transaksi]
   │
   ▼
Backend Eksekusi Prisma $transaction (Order PAID, Rekam Payment, Kosongkan Meja)
   │
   ▼
Muncul Struk Digital & Pemicu Cetak Printer ───> Transaksi Masuk ke Tab Recent Paid
```

### Flow 5: Alur Admin - Pemantauan Target & Dashboard
```
Admin Login ke /dashboard ───> Melihat 4 Grid Analitik Real-time
   ├── Grid 1: Pie Chart Rasio Gender Bulanan (P vs L)
   ├── Grid 2: Bar Chart Tren Omset 7 Hari Terakhir
   ├── Grid 3: Leaderboard 5 Menu Best Seller
   └── Grid 4: Visual Target Omset Bar (🔴 Merah < 70%, 🟡 Kuning 70-99%, 🟢 Hijau >= 100%)
```

### Flow 6: Pemindaian Menu Digital oleh Pelanggan (QR Meja View-Only)
```
Pelanggan Duduk di Meja ───> Scan QR Code Meja via Kamera HP
   │
   ▼
Browser HP Membuka: https://cafe.domain/menu?table=NomorMeja
   │
   ▼
Katalog Menu Publik Terbuka (Foto Produk, Deskripsi, Harga & Status Stok)
   │
   ▼
Pelanggan Memanggil Kasir / Pelayan untuk Memesan
```

---

## 11. Pages & Navigation

### Struktur Rute Frontend:
1. `/login`
   - Publik: Form login username & password.
   - Redirect berbasis role: Admin $\rightarrow$ `/dashboard`, Kasir $\rightarrow$ `/pos`.
2. `/pos` (Akses: Cashier & Admin)
   - Layar utama transaksi kasir.
   - Panel Katalog (kiri), Recent Orders & Order Detail / Keranjang (kanan).
3. `/dashboard` (Akses: Admin)
   - 4-Grid analitik (Pie Gender, Bar Omset 7 Hari, Best Seller, Progress Bar Target).
4. `/dashboard/account` (Akses: Admin)
   - Manajemen staf: Tabel daftar kasir, modal tambah akun, modal reset password, toggle aktif.
5. `/dashboard/menu` (Akses: Admin)
   - Manajemen katalog: Tabel produk, modal tambah/edit menu dengan file upload foto lokal, toggle ketersediaan.
6. `/dashboard/payment` (Akses: Admin)
   - Konfigurasi channel pembayaran: Tabel channel aktif, toggle status aktif channel.
7. `/dashboard/target` (Akses: Admin)
   - Form penetapan target omset bulanan & histori target tahunan.
8. `/dashboard/history` (Akses: Admin)
   - Riwayat penjualan: Filter tanggal, gender, metode bayar, export CSV, modal detail struk & cetak ulang.
9. `/dashboard/tables` (Akses: Admin)
   - Grid meja kafe dengan tombol preview & print/download QR Code masing-masing meja.
10. `/menu` (Akses: Publik)
    - Query param: `?table=NomorMeja`
    - Katalog menu mobile-friendly tanpa fitur checkout.

---

## 12. UI & Layout Requirements

### 12.1 Cashier POS Screen Layout (`/pos`) - Modern Minimalist POS

```text
┌───┬──────────────────────────────────────────────────────────────────────────────────────┬───────────────────────────────┐
│ C │  Active Orders (8)                                                 [🔍 Search orders]│ Order Details                 │
│ A │  [ All ]  [ Dine In ]  [ Takeaway ]                                              < > │ Order #045                    │
│ F ├──────────────────────────────────────────────────────────────────────────────────────┤ ┌─────────────┬─────────────┐ │
│ E │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                  │ │ Dine In (✓) │ Takeaway    │ │
│   │  │ Order #045   │ │ Order #046   │ │ Order #047   │ │ Order #048   │                  │ └─────────────┴─────────────┘ │
│ P │  │ [ Dine In ]  │ │ [ Takeaway ] │ │ [ Dine In ]  │ │ [ Dine In ]  │                  │ Customer Name: [ Rian       ] │
│ O │  │ Rian         │ │ Budi         │ │ Maya         │ │ Dimas        │                  ├───────────────────────────────┤
│ S │  │ 3 items      │ │ 1 item       │ │ 4 items      │ │ 2 items      │                  │ Order Items:                  │
│   │  │ Rp 65,000    │ │ Rp 28,000    │ │ Rp 85,000    │ │ Rp 42,000    │                  │ ┌───────────────────────────┐ │
│ 🏪│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘                  │ │ Brown Sugar Latte  Rp 20k │ │
│POS├──────────────────────────────────────────────────────────────────────────────────────│ │ [-]   1   [+]        [🗑️] │ │
│   │  Menu Catalog (32 items)                                         [🔍 Search menu... ]│ │ Note: [Less sugar]        │ │
│ 🧾│  [ All ]  [ Coffee ]  [ Non-Coffee ]  [ Main Course ]  [ Snacks & Pastry ]           │ └───────────────────────────┘ │
│HIS├──────────────────────────────────────────────────────────────────────────────────────│ ┌───────────────────────────┐ │
│   │  ┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐                  │ │ Special Fried Rice Rp 28k │ │
│   │  │ [Product Photo]   │ │ [Product Photo]   │ │ [Product Photo]   │                  │ │ [-]   1   [+]        [🗑️] │ │
│   │  │ Malang Meatballs  │ │ Special Fried Rice│ │ Brown Sugar Latte │                  │ │ Note: [Spicy, no onion]   │ │
│   │  │ Rp 25,000         │ │ Rp 28,000         │ │ Rp 20,000         │                  │ └───────────────────────────┘ │
│   │  │ [ + Add Item ]    │ │ [-]   1   [+]     │ │ [ + Add Item ]    │                  │ Customer Gender:              │
│   │  └───────────────────┘ └───────────────────┘ └───────────────────┘                  │ [ 👨 Male (✓) ]  [ 👩 Female ] │
│ 👤│                                                                                      ├───────────────────────────────┤
│Siti                                                                                      │ Total:              Rp 48,000 │
│ ▾ │                                                                                      │ ┌───────────────────────────┐ │
│   │                                                                                      │ │ Pay Now • Rp 48,000 →     │ │
│   │                                                                                      │ └───────────────────────────┘ │
│   │                                                                                      │ [ Save Open Bill ]            │
└───┴──────────────────────────────────────────────────────────────────────────────────────┴───────────────────────────────┘
```

#### Layout Component Architecture:
1. **Zone 1: Slim Left Navigation Rail (~64px):**
   - Top Brand Anchor: Cafe logo.
   - Navigation Icons: `[ 🏪 Register / POS ]` (primary active register) and `[ 🧾 Order History ]` (opens Slide-Over Drawer for completed transactions & reprint receipt).
   - Bottom Profile: Cashier avatar (`👤 Siti`) with interactive dropdown: Lock Register and Sign Out/Logout.

2. **Zone 2: Center Work Area (Active Orders Queue + Menu Catalog):**
   - **Top Section (Active Orders Line - Persisted):** Always visible at the top. Filter pills directly underneath title: `[ All ]`, `[ Dine In ]`, `[ Takeaway ]`. Dedicated order search bar for Order ID (e.g. "#045") or customer names. Navigation carousel `<` `>`. 1-tap loads order into the right panel.
   - **Bottom Section (Menu Catalog Grid with Category Bubbles):** Clean horizontal text pills without generic emoji clutter: `[ All ]`, `[ Recommended ⭐ ]`, `[ Best Seller 🔥 ]`, `[ Coffee ]`, `[ Mocktails ]`, `[ Non-Coffee ]`, `[ Main Course ]`, `[ Snacks & Pastry ]`. Category overflow handles 10+ categories in a single fixed row via smooth swipe/scroll carousel with `<` `>` arrows and a `[ 📑 Categories ▼ ]` popover grid. On tab `[ All ]`, products are cleanly grouped under distinct category section headers (`COFFEE (12 items)`, `MOCKTAILS (6 items)`, etc.) with dividers. Grid with 3–4 columns of photo cards, integer Rupiah prices, and `Sold Out` badges. Exclusive highlight badges `[ ⭐ Recommended ]` and `[ 🔥 Best Seller ]` are displayed on flagship cards. Clicking ANY card opens the **Guided Item Customization Modal** (guided flow for quantity, sugar level, ice level, spiciness preset chips, and kitchen notes).

3. **Zone 3: Right Order Details Panel (~380px):**
   - Header: Daily Ticket Sequence (`Order #045`) & Date/Time. When opening an existing open bill: shows `Viewing Order #042` with a `[ ✕ New Order ]` button to switch back to ringing up a fresh customer.
   - Segmented toggle: `[ Dine In ]` vs `[ Takeaway ]`.
   - Customer Name input: **Wajib diisi (Mandatory)**, e.g. "Rian", ensuring every order is clearly labeled for counter pickup or table service.
   - Ordered items with inline quantity stepper, custom notes beneath item, delete icon.
   - Gender selector 1-tap: `[ 👨 Male (L) ]` and `[ 👩 Female (P) ]` recording the payer's demographic.
   - Integrated Checkout Action: Solid Primary `[ Pay Now • Rp XX,XXX → ]` (clears ticket on payment) and Secondary Outline `[ Save Open Bill ]` (adds to Active Orders line).

4. **Slide-Over Drawer (Order History & Reprint Receipt):**
   - Accessible from the slim left rail without leaving the active register screen.
   - Displays completed transactions (`status = PAID`) with search filter and `[ Reprint Receipt ]` button (`window.print()`).

### 12.2 Aesthetic Direction (Modern Minimalism)
- **Palette:** Neutral modern (Slate / Zinc) with high-contrast functional accents (slate-900 primary, amber-500 open bill, emerald-600 paid).
- **Typography:** Contemporary clean sans-serif (Inter / Geist) with sharp visual hierarchy.
- **Components:** Built using Tailwind CSS + Shadcn UI primitives.
- **Thermal Receipt CSS:** Isolated 58mm/80mm receipt formatting hiding the web chrome during print.

### 12.3 Responsive Layout & Breakpoint Specifications (Hardware Ergonomics)
- **Desktop / Touch POS AIO ($\ge 1280\text{px}$):** 3-Zone penuh berdampingan (Left Rail 64px, Center Grid 4 kolom, Right Cart 380px fixed).
- **Tablet Landscape ($1024\text{px} - 1279\text{px}$) [Primary Device]:** 3-Zone ringkas berdampingan (Left Rail 56px, Center Grid 3 kolom, Right Cart 320px-340px ringkas) tanpa panel tersembunyi.
- **Tablet Portrait ($768\text{px} - 1023\text{px}$):** Center grid 3 kolom dengan floating bottom cart dock yang membuka slide-up drawer keranjang.
- **Mobile Screen ($< 768\text{px}$):** 2 kolom grid dengan bottom floating cart bar.
- **Touch Targets:** Seluruh tombol aksi & steppers $\ge 44 \times 44\text{px}$ memenuhi standar ergonomis tablet Apple HIG & Google Material Design.

---

## 13. Technology Stack
- **Frontend:**
  - Library: React 18+ dengan Vite.
  - Bahasa: TypeScript.
  - Styling: Tailwind CSS.
  - Icon: Lucide React.
  - Charting: Recharts (untuk Pie Chart & Bar Chart dashboard).
  - HTTP Client: Axios dengan Interceptor JWT.
- **Backend:**
  - Framework: NestJS (Node.js).
  - Bahasa: TypeScript.
  - Database ORM: Prisma ORM.
  - Autentikasi: Passport JWT + bcryptjs.
  - File Upload: Multer (disk storage ke folder `/uploads`).
  - Validasi: `class-validator` & `class-transformer`.
- **Database:**
  - PostgreSQL 15+.
- **DevOps & Lingkungan:**
  - Docker Compose (PostgreSQL, Backend NestJS, Frontend Vite).

---

## 14. System Architecture
```mermaid
graph TD
    ClientBrowser["Frontend SPA (Vite + React)"] -- HTTP/REST + JWT --> NestBackend["Backend API (NestJS)"]
    CustomerMobile["Kamera HP Pelanggan"] -- Scan QR Meja --> PublicMenu["Halaman Publik /menu?table=X"]
    PublicMenu -- GET /api/products --> NestBackend

    subgraph NestJS App
        AuthMod["Auth Module (JWT & bcrypt)"]
        PosMod["POS & Orders Module (ACID Checkout)"]
        MenuMod["Products & Upload Module"]
        StaffMod["Staff Users Module"]
        DashMod["Dashboard Analytics Aggregator"]
    end

    NestBackend --> NestJS App
    NestJS App --> Prisma["Prisma ORM"]
    Prisma --> Postgres[("PostgreSQL Database")]
    MenuMod -- Simpan File Gambar --> LocalStorage["/uploads/products (Static Files)"]
```

---

## 15. Database Design & Models

### 15.1 Entity Relationship
- `users` (1) $\rightarrow$ (N) `orders` (Relasi kasir pembuat order)
- `tables` (1) $\rightarrow$ (N) `orders` (Relasi meja penampung order)
- `categories` (1) $\rightarrow$ (N) `products`
- `orders` (1) $\rightarrow$ (N) `order_items`
- `products` (1) $\rightarrow$ (N) `order_items`
- `orders` (1) $\rightarrow$ (1) `payments` (Settlement 1-on-1)
- `monthly_targets` (Entity mandiri agregasi target per bulan/tahun)
- `payment_channels` (Master konfigurasi channel pembayaran)

### 15.2 Field & Type Specifications (Money in Integer Rupiah)
1. **`users`**
   - `id`: Int (PK, Auto Increment)
   - `username`: String (Unique, Indexed)
   - `passwordHash`: String
   - `name`: String
   - `role`: Enum (`ADMIN`, `CASHIER`)
   - `isActive`: Boolean (Default: true)
   - `createdAt`: DateTime (now)
2. **`tables`**
   - `id`: Int (PK)
   - `tableNumber`: String (Unique, misal: "Meja 01")
   - `qrIdentifier`: String (Unique UUID)
   - `isOccupied`: Boolean (Default: false)
   - `updatedAt`: DateTime
3. **`categories`**
   - `id`: Int (PK)
   - `name`: String
   - `slug`: String (Unique)
4. **`products`**
   - `id`: Int (PK)
   - `categoryId`: Int (FK $\rightarrow$ `categories.id`)
   - `name`: String
   - `price`: Int (Harga bulat dalam Rupiah, e.g. 25000)
   - `description`: String? (Opsional)
   - `imageUrl`: String? (Relative path static upload: `/uploads/products/...`)
   - `isAvailable`: Boolean (Default: true)
   - `createdAt`: DateTime
5. **`orders`**
   - `id`: Int (PK)
   - `invoiceNumber`: String (Unique, misal: `INV-20260907-0001`)
   - `orderType`: Enum (`DINE_IN`, `TAKE_AWAY`, Default: `DINE_IN`)
   - `tableId`: Int? (FK $\rightarrow$ `tables.id`, Opsional / Nullable untuk Take Away atau Dine In walk-in)
   - `cashierId`: Int (FK $\rightarrow$ `users.id`)
   - `customerName`: String? (Opsional)
   - `customerGender`: Enum (`L`, `P`) - Dicatat saat Checkout
   - `status`: Enum (`OPEN_BILL`, `PAID`, `CANCELLED`)
   - `subtotal`: Int (Total harga item)
   - `grandTotal`: Int (Subtotal bersih)
   - `createdAt`: DateTime
   - `updatedAt`: DateTime
6. **`order_items`**
   - `id`: Int (PK)
   - `orderId`: Int (FK $\rightarrow$ `orders.id`)
   - `productId`: Int (FK $\rightarrow$ `products.id`)
   - `quantity`: Int (Min 1)
   - `unitPrice`: Int (Harga saat transaksi terjadi)
   - `subtotal`: Int (`quantity * unitPrice`)
   - `notes`: String?
7. **`payments`**
   - `id`: Int (PK)
   - `orderId`: Int (FK $\rightarrow$ `orders.id`, Unique)
   - `category`: Enum (`CASH`, `THIRD_PARTY`, `EDC`)
   - `methodName`: String (misal: "Cash", "QRIS BCA", "EDC Mandiri")
   - `amountPaid`: Int (Nominal uang yang diserahkan pelanggan)
   - `changeDue`: Int (Kembalian: `amountPaid - grandTotal`)
   - `paidAt`: DateTime (now)
8. **`monthly_targets`**
   - `id`: Int (PK)
   - `month`: Int (1 - 12)
   - `year`: Int (misal: 2026)
   - `targetAmount`: BigInt / Int (Nominal target rupiah, misal: 50000000)
   - `createdAt`: DateTime
   - *Constraint:* `UNIQUE(month, year)`
9. **`payment_channels`**
   - `id`: Int (PK)
   - `name`: String (misal: "QRIS BCA", "Cash")
   - `category`: Enum (`CASH`, `THIRD_PARTY`, `EDC`)
   - `isActive`: Boolean (Default: true)

---

## 16. API Specifications

### Format Respons Standar:
- **Sukses:**
  ```json
  { "success": true, "data": {} }
  ```
- **Gagal:**
  ```json
  { "success": false, "error": { "code": "ERROR_CODE", "message": "Pesan deskriptif" } }
  ```

### Daftar Endpoint:

#### 16.1 Modul Autentikasi
- `POST /api/auth/login`
  - Body: `{ "username": "admin", "password": "password123" }`
  - Return: `{ "success": true, "token": "...", "user": { "id": 1, "username": "admin", "role": "ADMIN", "name": "Owner Kafe" } }`

#### 16.2 Modul Master Menu & Meja
- `GET /api/tables` (Akses: Kasir & Admin)
  - Return daftar meja dan status occupied / active order.
- `GET /api/products` (Akses: Publik, Kasir, Admin)
  - Query: `category_id`, `search`, `is_available`.
- `POST /api/products` (Akses: Admin)
  - Form-data: `name`, `price`, `categoryId`, `description`, `image` (file binary).
  - Simpan foto ke `/uploads/products` dan return URL produk.
- `PUT /api/products/:id` (Akses: Admin)
  - Update data menu dan/atau ganti foto.
- `DELETE /api/products/:id` (Akses: Admin)
  - Hapus produk (bila belum pernah dipesan, atau set `isAvailable=false` bila ada foreign key order).
- `PATCH /api/products/:id/toggle-availability` (Akses: Kasir & Admin)
  - Toggle cepat ketersediaan stok menu.

#### 16.3 Modul Transaksi POS & Checkout (ACID)
- `POST /api/orders/open-bill` (Akses: Kasir & Admin)
  - Body: `{ "orderType": "DINE_IN", "tableId": 2, "customerName": "Rian", "items": [{ "productId": 1, "quantity": 2, "notes": "Less sugar" }] }`
  - *(Catatan: `orderType` dapat berupa `DINE_IN` atau `TAKE_AWAY`. `tableId` opsional/nullable jika tipe Take Away atau tamu baru datang yang belum memilih meja).*
  - Aksi DB: Buat order status `OPEN_BILL`. Jika `tableId` diisi, set `table.isOccupied = true`.
- `POST /api/orders/:id/checkout` (Akses: Kasir & Admin)
  - Body: `{ "customerGender": "L", "paymentCategory": "CASH", "methodName": "Cash", "amountPaid": 100000 }`
  - Aksi DB (Atomic Transaction): Validasi `amountPaid >= grandTotal`, update order status `PAID`, catat payment & kembalian. Jika order memiliki `tableId`, set `table.isOccupied = false`.
- `GET /api/orders` (Akses: Kasir & Admin)
  - Query: `status=OPEN_BILL` atau `status=PAID&limit=5`.
  - Mengembalikan daftar pesanan untuk carousel horizontal *Orders Line* di layar POS.
- `GET /api/orders/:id` (Akses: Kasir & Admin)
  - Mengambil detail invoice lengkap untuk struk belanja dan cetak ulang (reprint).

#### 16.4 Modul Manajemen Staf (`/dashboard/account`)
- `GET /api/users` (Akses: Admin)
  - Daftar staf kasir dan admin.
- `POST /api/users` (Akses: Admin)
  - Body: `{ "username": "kasir2", "name": "Budi Kasir", "password": "...", "role": "CASHIER" }`
- `PATCH /api/users/:id/password` (Akses: Admin)
  - Body: `{ "newPassword": "..." }`
- `PATCH /api/users/:id/toggle-status` (Akses: Admin)
  - Mengaktifkan / menonaktifkan akun staf.

#### 16.5 Modul Manajemen Channel Pembayaran (`/dashboard/payment`)
- `GET /api/payment-channels` (Akses: Kasir & Admin)
- `POST /api/payment-channels` (Akses: Admin)
- `PATCH /api/payment-channels/:id/toggle` (Akses: Admin)

#### 16.6 Modul Dashboard Analitik & Target (`/dashboard`)
- `GET /api/dashboard/overview` (Akses: Admin)
  - Query: `month=9&year=2026`
  - Return:
    ```json
    {
      "success": true,
      "data": {
        "monthlyRevenue": 38500000,
        "targetAmount": 50000000,
        "targetPercentage": 77,
        "targetStatus": "YELLOW", 
        "genderDemographics": { "L": 142, "P": 198, "total": 340, "ratioFemale": 58.2 },
        "revenue7Days": [
          { "date": "2026-09-01", "total": 1250000 },
          { "date": "2026-09-02", "total": 1800000 }
        ],
        "bestSellers": [
          { "productId": 3, "productName": "Kopi Susu Gula Aren", "quantitySold": 240, "revenue": 4800000 }
        ]
      }
    }
    ```
- `POST /api/dashboard/targets` (Akses: Admin)
  - Body: `{ "month": 9, "year": 2026, "targetAmount": 50000000 }`
  - Upsert target penjualan bulanan.
- `GET /api/dashboard/reports/export` (Akses: Admin)
  - Query: `startDate=2026-09-01&endDate=2026-09-07&format=csv`
  - Mengembalikan stream file CSV berisi rekapitulasi transaksi.

---

## 17. Authentication & Sesi
- Menggunakan **JSON Web Token (JWT)** yang ditandatangani dengan `JWT_SECRET`.
- Masa berlaku token: 24 jam untuk sesi kasir operasional harian.
- Password dienkripsi menggunakan algoritma **bcrypt** dengan salt round 10.
- Payload token berisi `{ id, username, role }`.

---

## 18. Authorization & Proteksi
- Guard NestJS `JwtAuthGuard` memverifikasi keberadaan dan validitas Bearer token di header HTTP `Authorization`.
- Guard `RolesGuard` membatasi endpoint tertentu khusus role `ADMIN`. Kasir yang mencoba memanggil API admin akan menerima HTTP `403 Forbidden`.

---

## 19. Security Requirements & Integrity
1. **Money Accuracy Guardrail:** Seluruh field uang bertipe integer. Tidak ada pembulatan floating point yang dapat menyebabkan selisih pembukuan kas.
2. **Atomic ACID Execution:** Proses checkout wajib berada dalam blok transaksi database prisma:
   ```typescript
   await prisma.$transaction(async (tx) => {
     // 1. Update order status -> PAID
     // 2. Insert record payments
     // 3. Update table -> isOccupied = false
   });
   ```
3. **Penyimpanan Upload File yang Aman:**
   - Validasi MIME type file foto: hanya mengizinkan `image/jpeg`, `image/png`, `image/webp`.
   - Batas maksimum ukuran file: 2 MB per gambar.
   - Nama file di-generate secara acak menggunakan UUID v4 untuk mencegah *path traversal* atau tumpang tindih nama file.
4. **Sanitasi Input:** DTO divalidasi dengan `class-validator` (whitelist true, forbidNonWhitelisted true) untuk mencegah parameter injection.

---

## 20. Validation Rules
- `invoiceNumber`: Otomatis di-generate server dengan format `INV-YYYYMMDD-XXXX` (sequential / random 4 digit).
- `amountPaid`: Wajib $\ge$ `grandTotal`. Jika kurang, server melempar error `422 Unprocessable Entity`.
- `customerGender`: Wajib salah satu dari `'L'` atau `'P'` pada saat checkout.
- `quantity`: Integer positif $\ge 1$.
- `price`: Integer positif $\ge 0$.

---

## 21. Error Handling

| HTTP Status | Error Code | Deskripsi Skenario |
|---|---|---|
| `401 Unauthorized` | `INVALID_CREDENTIALS` | Username atau password salah saat login. |
| `401 Unauthorized` | `TOKEN_EXPIRED` | Sesi kasir habis, perlu login ulang. |
| `403 Forbidden` | `ACCESS_DENIED` | Kasir mencoba mengakses menu admin/dashboard. |
| `404 Not Found` | `ORDER_NOT_FOUND` | Nomor order atau meja tidak ditemukan. |
| `409 Conflict` | `TABLE_ALREADY_OCCUPIED` | Meja sudah memiliki transaksi Open Bill aktif. |
| `422 Unprocessable Entity` | `INSUFFICIENT_PAYMENT` | Uang bayar kasir lebih kecil dari total belanja. |
| `400 Bad Request` | `INVALID_FILE_TYPE` | File upload foto bukan format gambar yang valid. |

---

## 22. Edge Cases
1. **Kasir menekan tombol Bayar berulang kali (Double Click):** Frontend mendisable tombol bayar saat request sedang `in-flight`; backend mengunci record order agar tidak terjadi duplicate payment.
2. **Tamu Open Bill pindah meja:** Fitur edit pesanan memungkinkan kasir mengganti nomor meja aktif jika meja tujuan masih berstatus `isOccupied = false`.
3. **Menu mendadak Sold Out saat pesanan sedang diracik:** Validasi backend memeriksa status `isAvailable` menu sebelum invoice final dibuat.
4. **Internet kasir terputus saat mencetak struk:** Struk selalu tersimpan di riwayat; kasir dapat melakukan *Reprint Receipt* kapan saja dari panel Recent Orders setelah koneksi pulih.

---

## 23. Non-Functional Requirements
- **Latensi:** Respon API POS Kasir (tambah item, open bill, checkout) $< 200$ ms.
- **Dukungan Perangkat Cetak:** Format cetak CSS kompatibel dengan semua thermal printer (58mm dan 80mm) via dialog browser standar.
- **Responsif Mobile untuk Pelanggan:** Halaman menu digital `/menu` memiliki skor performa Lighthouse $> 90$, ringan dibuka di koneksi 4G/3G seluler tamu.

---

## 24. Testing Requirements (Superpowers Protocol)
1. **Unit Testing Finansial (Wajib):**
   - Perhitungan subtotal per item (`price * quantity`).
   - Perhitungan grand total keranjang.
   - Validasi uang tunai kembalian (`amountPaid - grandTotal`).
2. **Integration Testing Checkout (ACID):**
   - Pengujian skenario sukses: Order PAID, Payment tercatat, Meja kosong.
   - Pengujian skenario gagal (uang kurang / meja konflik): Memastikan seluruh perubahan di-rollback total tanpa meninggalkan data menggantung.

---

## 25. Environment Variables

```env
# Database PostgreSQL
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/cafe_pos?schema=public"

# Autentikasi JWT
JWT_SECRET="super-secret-jwt-key-cafe-pos-2026"
JWT_EXPIRES_IN="24h"

# Konfigurasi Aplikasi & Server
PORT=3000
NODE_ENV="development"
FRONTEND_URL="http://localhost:5173"

# Upload Direktori
UPLOAD_DIR="./uploads/products"
```

---

## 26. Deployment Requirements
- Mendukung orkestrasi **Docker Compose**:
  - Service `db`: Container PostgreSQL dengan persistent volume.
  - Service `backend`: Node.js Alpine menjalankan NestJS production build.
  - Service `frontend`: Web server Nginx menyajikan static build Vite React.
- Volume `/uploads` di-mount secara persisten agar foto produk yang diunggah tidak hilang saat container direstart.

---

## 27. Development Phases

```text
┌────────────────────────────────────────────────────────┐
│ 🟢 FASE 1: Core POS, Meja, Open Bill & Kasir (SELESAI)  │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│ 🟡 FASE 2: Manajemen Akun, Master Menu & Pembayaran    │
│    - CRUD Staf Kasir (/dashboard/account)               │
│    - CRUD Master Menu & Upload Foto (/dashboard/menu)   │
│    - Pengaturan Channel Pembayaran (/dashboard/payment) │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│ 🔵 FASE 3: Dashboard Analitik & Target Omset           │
│    - Agregasi Omset, Best Seller & Demografi Gender     │
│    - 4-Grid Dashboard Visual (/dashboard)               │
│    - Penetapan Target Omset & Progress Bar Warna        │
│    - Riwayat Transaksi & Export CSV (/dashboard/history)│
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│ 🟣 FASE 4: QR Meja & Menu Digital Pelanggan            │
│    - Generator & Cetak QR Meja (/dashboard/tables)      │
│    - Halaman Publik Menu Responsif HP (/menu?table=X)   │
└────────────────────────────────────────────────────────┘
```

---

## 28. Implementation Tasks (Actionable Roadmap)

### FASE 1: Core POS & Kasir (Fokus Utama / MVP)

#### Milestone 1.1: Database Schema, Seeder & Financial Engine (Prisma + PostgreSQL + TDD)
- [ ] **Task 1.1.1: Setup NestJS Architecture & Prisma ORM (`backend/`)**
  - Pastikan modul NestJS bersih dengan konfigurasi environment PostgreSQL `.env`.
  - Tulis `backend/prisma/schema.prisma` sesuai spesifikasi `docs/5_DATABASE.md` (User, Category, Product dengan `isRecommended` & `isBestSeller`, Order dengan nullable `tableId` & mandatory `customerName`, OrderItem, Payment, PaymentChannel, Table).
  - Eksekusi `npx prisma generate` dan push database (`npx prisma db push`).
- [ ] **Task 1.1.2: Database Seeder Realistis (`backend/prisma/seed.ts`)**
  - Akun Awal: 1 Admin (`admin` / `admin123`) dan 1 Kasir (`siti` / `kasir123`) dengan bcrypt hashing.
  - 5 Kategori Kafe: `Coffee`, `Mocktails`, `Non-Coffee`, `Main Course`, `Pastry & Snacks`.
  - 16 Produk Realistis dengan foto, harga Rupiah, serta flag `isRecommended` dan `isBestSeller`.
  - Channel Pembayaran: Tunai (Cash), QRIS BCA, EDC Mandiri.
  - Verifikasi seeder dengan `npx prisma db seed`.
- [ ] **Task 1.1.3: Superpowers TDD - Financial & Checkout Engine (`backend/src/orders/financial.calculator.*`)**
  - Tulis Unit Test `financial.calculator.spec.ts` sebelum kode:
    - Test kalkulasi subtotal item ($qty \times price$) dengan integer precision.
    - Test grand total order.
    - Test kalkulasi kembalian tunai ($amountPaid - grandTotal \ge 0$).
    - Test proteksi jika nominal bayar kurang ($amountPaid < grandTotal$ melempar error).
    - Test proteksi floating point (`0.1 + 0.2` tidak boleh terjadi di kalkulasi uang).
  - Tulis implementasi murni di `financial.calculator.ts` hingga semua test lulus 100%.

#### Milestone 1.2: Core Backend REST APIs (NestJS)
- [ ] **Task 1.2.1: Auth Module & JWT Guard (`backend/src/auth`)**
  - Endpoint `POST /api/auth/login` (validasi bcrypt, kembalikan JWT token, nama, dan role `ADMIN`/`CASHIER`).
  - Implementasikan `JwtAuthGuard` dan `RolesGuard`.
  - Unit test `auth.service.spec.ts` (skenario login sukses, password salah, user tidak aktif).
- [ ] **Task 1.2.2: Products & Catalog API (`backend/src/products`)**
  - Endpoint `GET /api/products` (filter `categoryId`, `search`, `isAvailable`, `isRecommended`, `isBestSeller`).
  - Endpoint `PATCH /api/products/:id/toggle-availability` (1-tap toggle status Tersedia / Sold Out).
  - Unit test `products.service.spec.ts`.
- [ ] **Task 1.2.3: Categories API (`backend/src/categories`)**
  - Endpoint `GET /api/categories` (mengembalikan daftar kategori dengan jumlah produk aktif).
- [ ] **Task 1.2.4: Orders, Open Bill, & Checkout API dengan ACID Transaction (`backend/src/orders`)**
  - Generator sequence Order ID harian (`Order #001`, `#002`, dst) & Invoice Number (`INV-YYYYMMDD-XXXX`).
  - Endpoint `POST /api/orders/open-bill` (Prisma `$transaction`: buat Order + OrderItems, status = `OPEN_BILL`, `customerName` wajib, `orderType`).
  - Endpoint `GET /api/orders/active` (mengambil seluruh pesanan aktif berstatus `OPEN_BILL` untuk Active Orders Line).
  - Endpoint `POST /api/orders/:id/checkout` (Prisma `$transaction`: validasi order, simpan payment tunai/QRIS/EDC, rekam demografi gender pembayar, ubah status order menjadi `PAID`). Rollback total jika ada langkah gagal.
  - Endpoint `GET /api/orders/history` (mengambil daftar transaksi selesai `PAID` dengan filter tanggal & search invoice/nama untuk Order History drawer).
  - Unit test `orders.service.spec.ts` memverifikasi integritas transaksi ACID dan kalkulasi finansial.

#### Milestone 1.3: Frontend Foundation & POS Screen (Vite + React + Tailwind + Lucide)
- [ ] **Task 1.3.1: Setup Frontend Foundation & Axios Interceptors (`frontend/`)**
  - Pastikan Vite + React + TypeScript + Tailwind CSS + Lucide React terkonfigurasi.
  - Setup Axios client dengan interceptor JWT token dan redirect otomatis jika token kadaluarsa.
  - Setup Global State / Cart Store untuk mengelola item keranjang kasir.
- [ ] **Task 1.3.2: Layar Login & Role Redirection (`/login`)**
  - Form login modern minimalis dengan proteksi autentikasi.
  - Role Redirection: Kasir otomatis masuk ke `/pos`, Admin masuk ke `/dashboard`.
- [ ] **Task 1.3.3: Zone 1 - Slim Left Navigation Rail (`~64px` / `56px`)**
  - Logo kafe di bagian atas.
  - Ikon Navigasi:
    - `[ 🏪 Register / POS ]` (Halaman aktif).
    - `[ 🧾 Order History ]` (Membuka Slide-Over Drawer tanpa unmount layar kasir).
    - `[ 💼 Shift / Drawer ]` (Placeholder modal buka/tutup kas kasir).
  - Avatar Kasir di bawah (`👤 Siti`) dengan popover: Info shift, lock register, dan Sign Out (logout).
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

### FASE 2: Manajemen Akun & Pengaturan Sistem
- [ ] **Task 2.1: Modul Akun Staf Backend & Frontend (`/dashboard/account`)**
  - Backend: Buat endpoint `GET /api/users`, `POST /api/users` (hash password), `PATCH /api/users/:id/password`, dan `PATCH /api/users/:id/toggle-status`.
  - Frontend: Buat halaman `/dashboard/account` dengan tabel staf, modal tambah kasir, modal ganti password, dan tombol status aktif.
- [ ] **Task 2.2: Modul Menu & Upload Gambar Backend (`/dashboard/menu`)**
  - Backend: Konfigurasi Multer untuk penyimpanan disk gambar ke `./uploads/products` dan sajikan static assets di `app.module.ts`.
  - Backend: Buat endpoint `POST /api/products` (dengan file upload), `PUT /api/products/:id`, dan `DELETE /api/products/:id`.
  - Frontend: Buat halaman `/dashboard/menu` dengan filter kategori, modal tambah/edit menu (input foto drag & drop / file picker), dan toggle ketersediaan stok.
- [ ] **Task 2.3: Modul Channel Pembayaran (`/dashboard/payment`)**
  - Backend: Endpoint CRUD `payment_channels`.
  - Frontend: Halaman `/dashboard/payment` untuk mengaktifkan / menonaktifkan metode pembayaran (Cash, QRIS, EDC).

### FASE 3: Dashboard Analitik & Target Omset
- [ ] **Task 3.1: Service Agregasi Analitik Backend**
  - Endpoint `GET /api/dashboard/overview`: Hitung revenue bulan ini, perbandingan target, rasio gender P/L, omset 7 hari, dan 5 menu best seller.
  - Endpoint `POST /api/dashboard/targets`: Simpan / update target nominal bulanan.
- [ ] **Task 3.2: Tampilan 4-Grid Dashboard Frontend (`/dashboard`)**
  - Grid 1: Pie Chart Recharts (Gender P vs L bulanan).
  - Grid 2: Bar Chart Recharts (Omset 7 hari terakhir).
  - Grid 3: List ranking Menu Best Seller.
  - Grid 4: Visual Target Progress Bar (🔴 Merah < 70%, 🟡 Kuning 70-99%, 🟢 Hijau $\ge$ 100%).
- [ ] **Task 3.3: Halaman Pengaturan Target Omset (`/dashboard/target`)**
  - Form input target nominal per bulan dan tabel histori target bulanan.
- [ ] **Task 3.4: Halaman Riwayat Transaksi & Export Laporan (`/dashboard/history`)**
  - Tabel riwayat transaksi dengan filter tanggal, gender (P/L), metode bayar, dan search invoice.
  - Modal pratinjau struk lama & tombol cetak ulang (reprint).
  - Tombol Export data penjualan ke file CSV.

### FASE 4: QR Meja & Menu Digital Pelanggan
- [ ] **Task 4.1: Generator QR Code Meja di Admin (`/dashboard/tables`)**
  - Pasang library generator QR code (`qrcode.react`).
  - Halaman manajemen meja dengan tombol download PNG QR Code atau cetak lembar stiker meja langsung.
- [ ] **Task 4.2: Halaman Publik Katalog Menu Digital (`/menu`)**
  - Buat rute publik `/menu?table=NomorMeja` dengan desain mobile-first.
  - Tampilkan header nama kafe & nomor meja, daftar menu per kategori dengan foto dan harga, serta indikator *Sold Out*.

---

## 29. Acceptance Criteria
1. **Manajemen Akun Staf:** Admin berhasil membuat akun kasir baru; kasir dapat login dengan kredensial tersebut dan langsung diarahkan ke layar `/pos` tanpa bisa mengakses `/dashboard`.
2. **Upload Foto Menu:** Foto menu yang diunggah dari modal admin tersimpan di folder uploads lokal dan tampil di katalog kasir serta menu publik pelanggan.
3. **Visual 4-Grid Dashboard:** Halaman `/dashboard` menampilkan data riil penjualan; jika omset mencapai target, progress bar otomatis berubah menjadi warna hijau.
4. **Riwayat & Export:** Data transaksi yang difilter dapat diunduh dalam format file `.csv` dengan data yang konsisten terhadap database.
5. **Akses QR Meja:** Scan QR meja via kamera HP mengarahkan langsung ke `/menu?table=X` dan menampilkan katalog menu tanpa meminta login.

---

## 30. Definition of Done (DoD)
- Seluruh endpoint API tervalidasi menggunakan DTO dan dilindungi Auth Guard.
- Perhitungan keuangan diuji dengan Unit Test tanpa kegagalan.
- Tidak ada error linter TypeScript atau warning kompilasi.
- Seluruh task roadmap yang diselesaikan telah diverifikasi di browser dan commit ke Git.

---

## 31. Assumptions
1. **Penyimpanan Foto Menu:** Menggunakan disk lokal server yang disajikan via static assets NestJS (diasumsikan server memiliki ruang disk cukup untuk gambar produk yang di-compress).
2. **Pencetakan Struk:** Mengandalkan browser standard print dialog (`window.print()`) yang diformat CSS thermal receipt, sehingga tidak memerlukan driver printer proprietary.
3. **Menu Digital QR Meja:** Bersifat view-only (katalog digital); pemesanan makanan/minuman tetap dilayani dan dicatat secara terpusat oleh kasir.
4. **Timezone:** Seluruh transaksi dan agregasi laporan menggunakan zona waktu Indonesia Barat (WIB / UTC+7).
