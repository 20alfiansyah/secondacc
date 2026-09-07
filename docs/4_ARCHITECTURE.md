# 4. SYSTEM ARCHITECTURE & TECH SPECIFICATION (ARCHITECTURE.MD)

> **Dokumen Master Utama:** Rincian lengkap 31 bab spesifikasi teknis tersedia di [PRD_MASTER.md](file:///f:/Project/secondacc/docs/PRD_MASTER.md).

---

## 4.1 Monorepo Architecture Overview

Sistem menggunakan arsitektur **Monorepo Client-Server terpadu** di bawah folder root `secondacc/`:

```text
secondacc/
├── AGENTS.md                  # Konstitusi AI (Ponytail KISS + Superpowers TDD)
├── docker-compose.yml         # Orkestrasi Docker (Postgres, NestJS, React)
├── docs/                      # Suite Dokumentasi Lengkap
│   ├── PRD_MASTER.md          # Single Source of Truth PRD 31 Bab
│   ├── 1_PRD.md
│   ├── 2_REQUIREMENTS.md
│   ├── 3_USER_FLOW.md
│   ├── 4_ARCHITECTURE.md
│   ├── 5_DATABASE.md
│   ├── 6_API_CONTRACTS.md
│   └── 7_ROADMAP_TASKS.md
│
├── backend/                   # Backend API Server (NestJS)
│   ├── src/
│   │   ├── auth/              # Modul Login & JWT Guard
│   │   ├── users/             # Manajemen Akun Staf (Kasir & Admin)
│   │   ├── categories/        # Kategori Menu
│   │   ├── products/          # Master Menu, Upload Foto & Toggle Sold Out
│   │   ├── tables/            # Manajemen Meja Kafe & QR Identifier
│   │   ├── orders/            # Open Bill, Checkout, & Transaction ACID
│   │   ├── dashboard/         # Agregasi 4 Grid, Target Bulanan, & Export CSV
│   │   ├── payment-channels/  # Konfigurasi Channel Pembayaran
│   │   ├── prisma/            # Prisma Service & Prisma Client
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── uploads/               # Direktori File Storage Lokal
│   │   └── products/          # Foto Menu (Disajikan via NestJS Static Assets)
│   ├── prisma/
│   │   ├── schema.prisma      # Single Source of Truth Skema PostgreSQL
│   │   └── seed.ts            # Seeder Data Awal
│   ├── test/                  # Unit Tests & E2E Tests (Superpowers TDD)
│   └── package.json
│
└── frontend/                  # Client Web App (Vite + React SPA)
    ├── src/
    │   ├── api/               # Axios Client instance & interceptor JWT
    │   ├── components/        # UI Widgets (Dialog, Buttons, Cards, Receipt)
    │   ├── pages/
    │   │   ├── Login.tsx
    │   │   ├── POSScreen.tsx  # Layar Kasir (Katalog + Order Detail + Recent Orders)
    │   │   ├── Dashboard/     # 4 Grid Overview, Target, Account, Menu, History, Tables
    │   │   └── CustomerMenu.tsx # Buku Menu Digital QR Meja Pelanggan
    │   ├── store/             # Zustand (useCartStore, useTableStore, useAuthStore)
    │   └── utils/             # Format Rupiah, Print Receipt Helper
    ├── tailwind.config.js
    └── package.json
```

---

## 4.2 Tech Stack Selection & Justification

| Komponen | Pilihan Teknologi | Alasan Pemilihan |
| :--- | :--- | :--- |
| **Backend Framework** | **NestJS (TypeScript)** | Arsitektur modular enterprise (Controller $\to$ Service), standar Dependency Injection, dan pengujian TDD mudah. |
| **Database** | **PostgreSQL** | Standar industri untuk integritas data transaksi keuangan, relasional meja & order, serta keamanan ACID. |
| **ORM** | **Prisma ORM** | 100% Type-safe, skema terpusat di `schema.prisma`, migrasi otomatis, dan web UI *Prisma Studio*. |
| **File Storage** | **Local Disk (Multer)** | Simpel, cepat, tanpa biaya eksternal; file disajikan sebagai static asset publik via `ServeStaticModule` NestJS. |
| **Frontend Framework** | **Vite + React (TypeScript)** | Super ringan (SPA), waktu start kilat, tanpa overhead SSR, sangat responsif untuk kasir. |
| **Styling & UI Library**| **Tailwind CSS + Shadcn UI** | Komponen kasir & dashboard modern, modular, ergonomis, dan mudah dikustomisasi. |
| **Visualisasi Chart** | **Recharts** | Library visualisasi React terbaik untuk membuat Pie Chart Gender dan Bar Chart Omset. |
| **State Management** | **Zustand** | Manajemen state keranjang kasir yang reaktif, bersih, tanpa boilerplate berlebih (Prinsip Ponytail). |

---

## 4.3 Data Flow & Pola Transaksi Atomik (ACID)

```
[ Kasir di Layar POS (Frontend) ]
              │
              ▼ (1) POST /api/orders/:id/checkout (Body: customerGender, paymentCategory, methodName, amountPaid)
[ NestJS OrderController ]
              │
              ▼ (2) Validasi DTO (Class-Validator)
[ OrderService (Prisma Transaction) ]
              │
              ├──► Buka Database Transaction ($transaction):
              │     a. Validasi Order Status == 'OPEN_BILL'
              │     b. Hitung Total & Validasi amountPaid >= grandTotal
              │     c. Insert Payment Record (nominal bayar & kembalian)
              │     d. Update Order: status = 'PAID', customerGender = 'P' / 'L'
              │     e. Update Table: isOccupied = false (kosongkan meja)
              │
              ▼ (3) Commit Transaction (Sukses Bersama / Rollback jika ada error)
[ Response 200 OK ke Frontend ]
              │
              ▼ (4) Memicu Dialog Cetak Struk Browser (window.print) & Reset Keranjang Kasir
```

---

## 4.4 Keamanan & Penanganan Kesalahan (Guardrails)
1. **Financial Precision:** Semua harga menu, subtotal, dan nominal bayar disimpan sebagai **Integer Rupiah Bulat** (bukan float) untuk menghindari bug pembulatan desimal.
2. **Audit & Non-Destructive:** Penonaktifan akun staf kasir atau produk menu menggunakan *soft toggle* (`isActive = false` atau `isAvailable = false`).
3. **Role Guard (RBAC):** Endpoint `/api/dashboard/*`, `/api/users/*`, dan master menu dilindungi dengan `RolesGuard` NestJS sehingga staf kasir tidak bisa mengakses data analitik dan pengaturan target owner.
4. **Validasi File Upload:** Pemeriksaan MIME type gambar (JPEG/PNG/WEBP), batasan ukuran file 2 MB, dan penggunaan nama acak UUID v4 untuk mencegah *path traversal*.
