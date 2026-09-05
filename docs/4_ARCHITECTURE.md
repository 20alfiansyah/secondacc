# 4. SYSTEM ARCHITECTURE & TECH SPECIFICATION (ARCHITECTURE.MD)

## 4.1 Monorepo Architecture Overview

Sistem menggunakan arsitektur **Monorepo Client-Server terpadu** di bawah folder root `secondacc/`:

```text
secondacc/
├── AGENTS.md                  # Konstitusi AI (Ponytail KISS + Superpowers TDD)
├── opencode.json              # Konfigurasi plugin OpenCode lokal
├── .agents/skills/            # Skills lokal (superpowers & ponytail)
├── docs/                      # SpecKit Suite Dokumentasi Lengkap
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
│   │   ├── users/             # Manajemen Akun Staf (Kasir & Inventory)
│   │   ├── categories/        # Kategori Menu
│   │   ├── products/          # Master Menu & Toggle Sold Out
│   │   ├── tables/            # Manajemen Meja Kafe
│   │   ├── orders/            # Open Bill, Checkout, & Transaction ACID
│   │   ├── dashboard/         # Agregasi 4 Grid, Target Bulanan, & History
│   │   ├── prisma/            # Prisma Service & Prisma Client
│   │   └── app.module.ts
│   ├── prisma/
│   │   └── schema.prisma      # Single Source of Truth Skema PostgreSQL
│   ├── test/                  # Unit & E2E Tests (Superpowers)
│   └── package.json
│
└── frontend/                  # Client Web App (Vite + React SPA)
    ├── src/
    │   ├── api/               # Axios Client instance & endpoint calls
    │   ├── components/        # UI Widgets (Shadcn Dialog, Buttons, Cards)
    │   ├── pages/
    │   │   ├── Login.tsx
    │   │   ├── POSScreen.tsx  # Layar Kasir 2 Kolom (Katalog + Keranjang)
    │   │   ├── Dashboard/     # 4 Grid Overview, Target, Account, Menu, History
    │   │   └── CustomerMenu.tsx # Buku Menu Digital QR Meja Pelanggan
    │   ├── store/             # Zustand (useCartStore, useTableStore, useAuthStore)
    │   └── utils/             # Format Rupiah, Print Helper
    ├── tailwind.config.js
    └── package.json
```

---

## 4.2 Tech Stack Selection & Justification

| Komponen | Pilihan Teknologi | Alasan Pemilihan |
| :--- | :--- | :--- |
| **Backend Framework** | **NestJS (TypeScript)** | Arsitektur modular enterprise (Controller $\to$ Service), standar Dependency Injection, dan mudah di-test. |
| **Database** | **PostgreSQL** | Standar industri untuk integritas data transaksi keuangan, relasional meja & order, serta keamanan ACID. |
| **ORM** | **Prisma ORM** | 100% Type-safe, skema terpusat di `schema.prisma`, migrasi otomatis, dan dilengkapi web UI *Prisma Studio*. |
| **Frontend Framework** | **Vite + React (TypeScript)** | Super ringan (SPA), waktu start 0.1 detik, tanpa overhead SSR, sangat responsif untuk kasir. |
| **Styling & UI Library**| **Tailwind CSS + Shadcn UI** | Komponen kasir & dashboard modern, modular, dan mudah dikustomisasi. |
| **Visualisasi Chart** | **Recharts** | Library visualisasi React terbaik untuk membuat Pie Chart Gender dan Bar Chart Omset. |
| **State Management** | **Zustand** | Manajemen keranjang kasir yang reaktif, bersih, tanpa boilerplate bertele-tele (Prinsip Ponytail). |

---

## 4.3 Data Flow & Pola Transaksi Atomik (ACID)

```
[ Kasir di Layar POS (Frontend) ]
              │
              ▼ (1) POST /api/orders/:id/checkout (Body: customerGender, paymentMethod, amountPaid)
[ NestJS OrderController ]
              │
              ▼ (2) Validasi DTO (Class-Validator)
[ OrderService (Prisma Transaction) ]
              │
              ├──► Buka Database Transaction ($transaction):
              │     a. Validasi Order Status == 'OPEN_BILL'
              │     b. Hitung Total & Validasi Nominal Uang
              │     c. Insert Payment Record
              │     d. Update Order: status = 'PAID', customerGender = 'P' / 'L'
              │     e. Update Table: isOccupied = false
              │
              ▼ (3) Commit Transaction (Sukses Bersama / Rollback jika ada error)
[ Response 200 OK ke Frontend ]
              │
              ▼ (4) Memicu Dialog Cetak Struk Browser (window.print) & Reset Keranjang Kasir
```

---

## 4.4 Keamanan & Penanganan Kesalahan (Guardrails)
1. **Financial Precision:** Semua harga menu, subtotal, dan nominal bayar disimpan sebagai **Integer Rupiah Bulat** (bukan float) untuk menghindari bug desimal.
2. **Audit & Non-Destructive:** Penghapusan menu atau penonaktifan staf kasir menggunakan *soft toggle* (`isActive = false` atau `isAvailable = false`).
3. **Role Guard:** Endpoint `/api/dashboard/*` dilindungi dengan `RolesGuard` NestJS sehingga staf kasir tidak bisa mengakses data analitik dan pengaturan target owner.
