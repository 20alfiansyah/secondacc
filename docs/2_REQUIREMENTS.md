# 2. DETAILED REQUIREMENTS & BUSINESS RULES (REQUIREMENTS.MD)

## 2.1 Halaman Kasir / POS Screen (`/pos`)

### A. Tata Letak (Two-Column Layout)
1. **Kolom Kiri - Katalog Menu:**
   - Tab Kategori (Semua, Kopi, Makanan Berat, Non-Kopi, Snack).
   - Search bar live (pencarian instan berdasarkan nama menu).
   - Kartu Menu: Gambar/ikon, Nama Menu, Harga (Format Rupiah), dan Lencana Status (*Tersedia* / *Sold Out*).
   - Menu berstatus *Sold Out* dinonaktifkan (tidak bisa diklik/ditambahkan ke keranjang).
2. **Kolom Kanan - Keranjang Pesanan (Cart Summary):**
   - Pemilih Nomor Meja (Dropdown atau nomor meja yang sedang aktif).
   - Daftar item di keranjang (Nama, Harga Satuan, Pengatur Kuantiti `+` / `-`, Tombol Hapus).
   - Catatan khusus per item (misal: "Less sugar", "Pedas").
   - Subtotal dan Grand Total terhitung otomatis.

### B. Dua Aksi Utama Kasir
1. **Tombol "Save / Open Bill":**
   - Menyimpan pesanan ke nomor meja yang dipilih tanpa melakukan pembayaran langsung.
   - Status order berubah menjadi `OPEN_BILL`.
   - Meja ditandai sebagai `TERISI` (Occupied).
   - Kasir bisa kembali membuka meja tersebut nanti untuk menambah pesanan atau melakukan pembayaran.
2. **Tombol "Checkout / Payment":**
   - Membuka modal pembayaran transaksi.

### C. Modal Pembayaran (Payment Modal)
- **1. Pilihan Demografi Gender Pelanggan (Wajib 1 Klik):**
  - Tombol pilihan: **`[ 👨 Laki-laki (L) ]`** dan **`[ 👩 Perempuan (P) ]`**.
  - Kasir memilih berdasarkan orang yang memesan/membayar di kasir.
  - Data ini tersimpan untuk mengisi Pie Chart di dashboard admin.
- **2. Pilihan Metode Pembayaran (3 Kategori):**
  - **Tunai (Cash):**
    - Input nominal uang diterima.
    - Tombol cepat nominal: *Uang Pas*, *Rp 20.000*, *Rp 50.000*, *Rp 100.000*.
    - Kalkulasi kembalian otomatis secara real-time (`Kembalian = Uang Diterima - Grand Total`).
  - **Third Party:** Pilihan QRIS / E-Wallet (GoPay, OVO, ShopeePay).
  - **EDC:** Pilihan Mesin Kartu Debit/Kredit (BCA, Mandiri, BRI).
- **3. Tombol Selesaikan & Cetak Struk:**
  - Status order berubah menjadi `PAID`.
  - Meja otomatis berubah status menjadi `KOSONG` (Available).
  - Menampilkan struk belanja digital & memicu dialog cetak printer (`window.print()`).

---

## 2.2 Aturan Stok: "Tersedia / Sold Out" (KISS & Ponytail)
- Tidak menggunakan sistem kalkulasi gramasi bahan baku yang rumit.
- Setiap menu memiliki flag boolean `is_available` (Default: `true`).
- Staf / Admin dapat mengubah status menu menjadi `false` (*Sold Out*) kapan saja dari menu dashboard atau kasir jika bahan di dapur habis.

---

## 2.3 Rincian Dashboard Admin (`/dashboard`)

### A. Dashboard Utama (4 Grid System)
1. **Grid 1 - Kiri Atas (Pie Chart Gender):**
   - Menampilkan proporsi transaksi berdasarkan gender pelanggan (**Laki-laki vs Perempuan**).
   - Filter default: Bulan berjalan (bisa memilih bulan dan tahun).
2. **Grid 2 - Kanan Atas (Bar Chart Pendapatan):**
   - Menampilkan grafik batang total nominal omset penjualan.
   - Dilengkapi filter interaktif: **Filter 7 Hari Terakhir** dan **Filter Harian per Bulan**.
3. **Grid 3 - Kiri Bawah (List Menu Best Seller):**
   - Peringkat 5–10 menu yang paling banyak terjual (berdasarkan jumlah kuantiti terpesan).
   - Menampilkan: Nama menu, kategori, total porsi terjual, dan kontribusi omset.
4. **Grid 4 - Kanan Bawah (Progress Bar Target Bulanan):**
   - Mengukur total akumulasi omset bulan ini terhadap target yang disetel di `/dashboard/target`.
   - **Logika Warna Indikator:**
     - 🔴 **Merah:** Total Pendapatan < Target (Belum tercapai).
     - 🟡 **Kuning:** Total Pendapatan = Target (Tepat mencapai target / toleransi 95%–100%).
     - 🟢 **Hijau:** Total Pendapatan > Target (Melebihi target).

### B. Sub-Menu Dashboard Lainnya
- **`/dashboard/target`:** 
  - Form input target nominal rupiah (Rp) per bulan (contoh: Target September 2026 = Rp 50.000.000).
  - Riwayat target bulan-bulan sebelumnya.
- **`/dashboard/account`:**
  - Manajemen akun staf dengan 2 role operasional: **Kasir (CASHIER)** dan **Staf Tambahan (INVENTORY)**.
  - Aksi: Tambah akun baru, edit nama/username, ganti password, dan tombol toggle **Disable / Active** (bukan hard delete).
- **`/dashboard/menu`:**
  - Manajemen katalog menu: Tambah menu baru, edit nama, pilih kategori, ubah harga jual, dan toggle status *Tersedia / Sold Out*.
- **`/dashboard/payment`:**
  - Pengaturan nama channel pembayaran aktif untuk kategori Cash, Third Party (QRIS/E-Wallet), dan EDC.
- **`/dashboard/history`:**
  - Tabel riwayat transaksi dengan filter:
    - Filter Rentang Tanggal / Hari.
    - Filter Produk tertentu.
    - Filter Gender (Semua / Laki-laki / Perempuan).
  - Aksi:
    - **Export Data** ke format CSV/Excel.
    - **View Struk Digital** (Modal pratinjau struk).
    - **Print Struk / Cetak Ulang**.
