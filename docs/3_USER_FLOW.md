# 3. USER FLOWS & INTERACTION JOURNEYS (USER_FLOW.MD)

## Flow 1: Login & Navigasi Berdasarkan Peran (Role-Based Routing)

```mermaid
flowchart TD
    A([Pengguna Membuka Web]) --> B[Halaman Login]
    B --> C{Autentikasi Kredensial}
    C -- Gagal --> B
    C -- Sukses --> D{Cek Role Pengguna}
    D -- Kasir (CASHIER) --> E([Langsung Masuk Layar POS /pos])
    D -- Admin (ADMIN) --> F([Masuk Dashboard Utama /dashboard])
    D -- Staf (INVENTORY) --> G([Masuk Menu Manajemen /dashboard/menu])
```

---

## Flow 2: Alur Kasir - Manajemen Meja & Open Bill

```mermaid
flowchart TD
    A[Kasir di Halaman POS] --> B[Pilih Nomor Meja Pelanggan]
    B --> C{Meja Sedang Terisi?}
    C -- Ya (Ada Open Bill) --> D[Muat Daftar Pesanan Sebelumnya]
    C -- Tidak (Meja Kosong) --> E[Mulai Keranjang Kosong]
    D --> F[Kasir Menambah / Mengubah Menu]
    E --> F
    F --> G{Pilihan Aksi Kasir}
    G -- Simpan Meja --> H[Klik Tombol 'Save / Open Bill']
    H --> I[Backend Simpan Status = OPEN_BILL & Meja = OCCUPIED]
    I --> J[Keranjang Reset, Siap Melayani Meja Berikutnya]
    G -- Pelanggan Mau Bayar --> K[Klik Tombol 'Checkout / Payment']
    K --> L([Buka Modal Pembayaran])
```

---

## Flow 3: Alur Pembayaran & Pencatatan Gender (Checkout Flow)

```mermaid
flowchart TD
    A[Buka Modal Pembayaran] --> B[Kasir Memilih Gender Pelanggan: P atau L]
    B --> C[Pilih Kategori Pembayaran]
    C -- Tunai (Cash) --> D[Input Uang Diterima / Klik Nominal Cepat]
    D --> E[Sistem Hitung Otomatis Uang Kembalian]
    C -- Third Party (QRIS) --> F[Pindai QRIS & Konfirmasi Pembayaran]
    C -- EDC (Kartu) --> G[Gesek Kartu di Mesin EDC & Konfirmasi]
    E --> H[Klik 'Selesaikan Transaksi']
    F --> H
    G --> H
    H --> I[Backend Eksekusi Transaksi DB:]
    I --> J[1. Update Order Status = PAID]
    J --> K[2. Simpan Data Payment & Gender P/L]
    K --> L[3. Set Meja Status = AVAILABLE Kosong Kembali]
    L --> M[Tampilkan Struk Digital & Pemicu Cetak Printer]
    M --> N([Selesai])
```

---

## Flow 4: Alur Admin - Pemantauan Target & Dashboard

```mermaid
flowchart TD
    A[Admin Login ke /dashboard] --> B[Lihat 4 Grid Utama:]
    B --> C[1. Pie Chart Demografi Gender P vs L]
    B --> D[2. Bar Chart Omset Harian / 7 Hari]
    B --> E[3. List 5 Menu Terlaris]
    B --> F[4. Progress Bar Target Omset Bulanan]
    F --> G{Warna Indikator Target}
    G -- Omset < Target --> H[🔴 Bar Berwarna Merah]
    G -- Omset = Target --> I[🟡 Bar Berwarna Kuning]
    G -- Omset > Target --> J[🟢 Bar Berwarna Hijau]
    B --> K[Navigasi ke /dashboard/target]
    K --> L[Input Target Nominal Omset Bulan Depan & Simpan]
```

---

## Flow 5: Alur Pelanggan - Pindai QR Code Meja (Menu Digital)
1. Pelanggan duduk di Meja 05.
2. Pelanggan memindai QR Code di meja menggunakan kamera smartphone.
3. Browser smartphone membuka URL: `https://namakafe.com/menu?table=05`.
4. Pelanggan melihat buku menu digital yang responsif:
   - Filter Kategori: Kopi, Makanan Berat, Minuman, Snack.
   - Foto, nama menu, deskripsi, harga, dan penanda status (Tersedia / Sold Out).
5. Pelanggan memilih menu yang diinginkan dan memesan ke kasir.
