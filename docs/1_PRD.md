# 1. PRODUCT REQUIREMENTS DOCUMENT (PRD.MD)

## 1.1 Visi Produk
- **Nama Produk:** Cafe POS & Management System
- **Deskripsi:** Sistem Point of Sale (POS) berbasis Web modern yang dirancang khusus untuk operasional kafe (makanan berat, kopi, minuman, dan snack) dengan manajemen meja, alur pesanan Open Bill, pelacakan demografi pelanggan (Gender P/L), serta dashboard analitik target penjualan visual.
- **Model Arsitektur:** Monorepo Client-Server (Backend NestJS + Frontend Vite React SPA + PostgreSQL).

---

## 1.2 Target Pengguna & Persona
1. **Kasir (Cashier):**
   - Menginginkan alur checkout secepat kilat (0 delay).
   - Langsung diarahkan ke layar transaksi begitu login.
   - Bisa menyimpan pesanan meja sementara (**Open Bill**) dan memproses pembayaran dengan cepat.
   - Mencatat gender pelanggan (**P / L**) hanya dengan 1 klik sebelum struk dicetak.
2. **Admin / Owner:**
   - Memantau performa penjualan secara real-time melalui **4 Grid Dashboard**.
   - Menetapkan target omset bulanan dengan indikator visual (Merah, Kuning, Hijau).
   - Mengelola master menu (harga, deskripsi, status Tersedia / Sold Out).
   - Mengatur akun staf (Kasir & Staf Tambahan) dan metode pembayaran (Cash, Third-Party, EDC).
3. **Pelanggan Kafe (Customer):**
   - Dapat memindai **QR Code di meja/kursi** untuk membuka buku menu digital langsung dari HP.

---

## 1.3 Rencana Pengembangan Bertahap (Phased Roadmap)

### 🟢 FASE 1: Core POS & Kasir (Fokus Utama / MVP)
- Sistem Autentikasi Kasir & Admin.
- Master Data Kategori, Menu Makanan & Minuman (Status: Tersedia / Sold Out).
- Manajemen Meja Kafe (Nomor Meja & Status Terisi/Kosong).
- Halaman Kasir POS:
  - Katalog Menu (Kiri) & Keranjang Pesanan (Kanan).
  - Tombol **Open Bill** (Simpan pesanan meja yang masih nongkrong).
  - Tombol **Checkout / Payment** (Modal bayar + Pilihan Gender P/L + Hitung kembalian tunai).
- Struk Pembayaran Digital & Cetak Struk (Print Receipt).

### 🟡 FASE 2: Manajemen Akun & Pengaturan Sistem
- Halaman `/dashboard/account`: CRUD staf kasir (tambah akun, ganti password, toggle aktif/disable).
- Halaman `/dashboard/menu`: Admin CRUD master menu dan update harga.
- Halaman `/dashboard/payment`: Konfigurasi metode pembayaran (Cash, Third-Party QRIS/E-Wallet, EDC).

### 🔵 FASE 3: Dashboard Analitik & Target
- Halaman Utama `/dashboard` (4 Grid):
  1. **Grid Kiri Atas (Pie Chart):** Demografi gender pelanggan bulanan (Perempuan vs Laki-laki).
  2. **Grid Kanan Atas (Bar Chart):** Total omset bulanan & tren 7 hari terakhir.
  3. **Grid Kiri Bawah (List):** Daftar menu paling laris (Best Seller).
  4. **Grid Kanan Bawah (Progress Bar):** Realisasi vs Target Omset Bulanan (Merah / Kuning / Hijau).
- Halaman `/dashboard/target`: Form penetapan nominal target penjualan per bulan.
- Halaman `/dashboard/history`: Riwayat transaksi lengkap dengan filter tanggal, produk, gender (P/L), serta aksi Export (CSV/Excel) dan cetak ulang struk.

### 🟣 FASE 4: QR Barcode Meja Pelanggan
- Generator QR Code untuk setiap nomor meja.
- Halaman publik responsif HP (`/menu?table=X`) sebagai buku menu digital pelanggan.
