# 6. API CONTRACTS & SPECIFICATIONS (API_CONTRACTS.MD)

> **Dokumen Master Utama:** Rincian lengkap 31 bab spesifikasi teknis tersedia di [PRD_MASTER.md](file:///f:/Project/secondacc/docs/PRD_MASTER.md).

Base URL: `http://localhost:3000/api`

Format Respons Standar:
- **Sukses:** `{ "success": true, "data": ... }`
- **Error:** HTTP status + body `{ "code": "STRING_CODE", "message": "Pesan deskriptif" }` — dilempar langsung lewat NestJS exception (`BadRequestException({ code, message })` dll) TANPA wrapper, konsisten dengan implementasi Fase 1. Frontend membaca `error.response.data.message`.

---

## 6.1 Authentication

### `POST /api/auth/login`
- **Akses:** Publik
- **Request Body:**
  ```json
  {
    "username": "kasir1",
    "password": "password123"
  }
  ```
- **Response 200 OK:**
  ```json
  {
    "success": true,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 2,
      "username": "kasir1",
      "name": "Siti Kasir",
      "role": "CASHIER"
    }
  }
  ```
- **Error:** `401 INVALID_CREDENTIALS`, `401 ACCOUNT_DISABLED`.

---

## 6.2 Tables & Menu (Katalog & Meja)

### `GET /api/tables`
- **Akses:** Kasir & Admin
- **Response 200 OK:**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": 1,
        "tableNumber": "Meja 01",
        "qrIdentifier": "tb-01-uuid",
        "isOccupied": true,
        "activeOrder": {
          "id": 45,
          "invoiceNumber": "INV-20260907-0045",
          "customerName": "Rian",
          "subtotal": 65000,
          "itemCount": 3
        }
      },
      {
        "id": 2,
        "tableNumber": "Meja 02",
        "qrIdentifier": "tb-02-uuid",
        "isOccupied": false,
        "activeOrder": null
      }
    ]
  }
  ```

### `GET /api/products`
- **Akses:** Publik, Kasir, Admin
- **Query Params:** `?categoryId=1&search=kopi&isAvailable=true`
- **Response 200 OK:**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": 10,
        "name": "Kopi Susu Gula Aren",
        "price": 20000,
        "categoryId": 1,
        "categoryName": "Kopi",
        "description": "Espresso + fresh milk + gula aren organik",
        "imageUrl": "/uploads/products/kopi-aren.webp",
        "isAvailable": true
      }
    ]
  }
  ```

### `POST /api/products` (Admin Only)
- **Akses:** Admin (`RolesGuard`)
- **Content-Type:** `multipart/form-data`
- **Form Fields:** `name`, `price`, `categoryId`, `description` (opsional), `image` (file binary JPEG/PNG/WEBP $\le 2$ MB).
- **Response 201 Created:**
  ```json
  {
    "success": true,
    "data": {
      "id": 11,
      "name": "Caramel Macchiato",
      "price": 25000,
      "imageUrl": "/uploads/products/d7f1-macchiato.webp",
      "isAvailable": true
    }
  }
  ```

### `PUT /api/products/:id` (Admin Only)
- **Akses:** Admin
- **Content-Type:** `multipart/form-data` / `application/json`
- **Form Fields:** Update nama, harga, deskripsi, dan/atau file foto baru (`image`). Jika file baru di-upload, file lama dihapus dari disk.
- **Error:** `404 PRODUCT_NOT_FOUND`, `400 INVALID_CATEGORY_ID`, `413 FILE_TOO_LARGE`, `415 INVALID_FILE_TYPE`

### `DELETE /api/products/:id` (Admin Only)
- **Akses:** Admin
- **Response 200 OK:** `{ "success": true, "data": { "id": 11 } }`
- **Error:** `409 PRODUCT_IN_USE` — produk sudah pernah masuk `OrderItem` (FK Restrict; riwayat transaksi immutable tidak boleh rusak). Produk yang belum pernah di-order boleh hard-delete beserta file gambarnya.

> **Konvensi `imageUrl`:** path relatif `/uploads/products/<uuid>.<ext>` — disajikan statis via ServeStaticModule di `/uploads`. Dev: Vite proxy `/uploads` → backend; prod: nginx static.

### `PATCH /api/products/:id/toggle-availability`
- **Akses:** Kasir & Admin
- **Response 200 OK:**
  ```json
  {
    "success": true,
    "data": {
      "id": 10,
      "name": "Kopi Susu Gula Aren",
      "isAvailable": false
    }
  }
  ```

---

## 6.3 Orders, Open Bill, & Checkout (ACID)

### `POST /api/orders/open-bill`
- **Akses:** Kasir & Admin
- **Request Body:**
  ```json
  {
    "orderType": "DINE_IN",
    "tableId": 1,
    "customerName": "Rian",
    "items": [
      { "productId": 10, "quantity": 2, "notes": "Less ice" },
      { "productId": 15, "quantity": 1, "notes": null }
    ]
  }
  ```
  *(Catatan: `orderType` bernilai `"DINE_IN"` atau `"TAKE_AWAY"`. Field `tableId` bersifat opsional/nullable jika tipe Take Away atau tamu baru datang yang belum memilih meja).*
- **Response 201 Created:**
  ```json
  {
    "success": true,
    "data": {
      "orderId": 45,
      "invoiceNumber": "INV-20260907-0045",
      "orderType": "DINE_IN",
      "status": "OPEN_BILL",
      "tableNumber": "Meja 01",
      "customerName": "Rian",
      "subtotal": 65000,
      "grandTotal": 65000
    }
  }
  ```

### `POST /api/orders/:id/checkout` (ACID Transaction)
- **Akses:** Kasir & Admin
- **Request Body:**
  ```json
  {
    "customerGender": "L",
    "paymentCategory": "CASH",
    "methodName": "Cash",
    "amountPaid": 100000
  }
  ```
- **Response 200 OK:**
  ```json
  {
    "success": true,
    "data": {
      "invoiceNumber": "INV-20260907-0045",
      "status": "PAID",
      "orderType": "DINE_IN",
      "customerGender": "L",
      "customerName": "Rian",
      "grandTotal": 65000,
      "amountPaid": 100000,
      "changeDue": 35000,
      "paidAt": "2026-09-07T21:00:00.000Z",
      "cashierName": "Siti Kasir",
      "tableNumber": "Meja 01"
    }
  }
  ```

### `GET /api/orders`
- **Akses:** Kasir & Admin
- **Query Params:** `?status=OPEN_BILL` atau `?status=PAID&limit=5`
- **Response 200 OK:** Mengembalikan daftar transaksi untuk mengisi carousel *Orders Line* (Open Bill aktif dan 5 transaksi selesai terakhir).

### `GET /api/orders/:id`
- **Akses:** Kasir & Admin
- **Response 200 OK:** Mengambil rincian invoice lengkap untuk pratinjau struk belanja & reprint.

---
## 6.4 Modul Manajemen Staf (`/dashboard/account`)

### `GET /api/users` (Admin Only)
- **Akses:** Admin (`JwtAuthGuard` + `RolesGuard('ADMIN')`)
- **Response 200 OK:**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": 1,
        "username": "admin",
        "name": "Admin",
        "role": "ADMIN",
        "isActive": true,
        "createdAt": "2026-09-01T00:00:00.000Z"
      }
    ]
  }
  ```
  *(Field `passwordHash` TIDAK PERNAH dikirim ke client.)*

### `POST /api/users` (Admin Only)
- **Request Body:**
  ```json
  {
    "username": "kasir2",
    "name": "Budi Santoso",
    "password": "password123",
    "role": "CASHIER"
  }
  ```
- **Response 201 Created:** objek user seperti di `GET` (tanpa hash). Password di-hash `bcryptjs`, minimal 6 karakter.
- **Error:** `409 USERNAME_TAKEN`, `400` (validasi field / role bukan `ADMIN|CASHIER`)

### `PATCH /api/users/:id/password` (Admin Only)
- **Request Body:** `{ "newPassword": "passwordBaru123" }` (min 6 char, di-hash ulang)
- **Response 200 OK:** `{ "success": true, "data": { "id": 3, "username": "kasir2", "isActive": true } }`
- **Error:** `404 USER_NOT_FOUND`

### `PATCH /api/users/:id/toggle-status` (Admin Only)
- **Response 200 OK:** `{ "success": true, "data": { "id": 3, "isActive": false } }`
- **Error:** `400 CANNOT_DISABLE_SELF` — admin tidak boleh menonaktifkan akunnya sendiri; `404 USER_NOT_FOUND`.

---

## 6.5 Modul Manajemen Channel Pembayaran (`/dashboard/payment`)

### `GET /api/payment-channels`
- **Akses:** Kasir & Admin
- **Query Params:** `?isActive=true` — POS hanya butuh channel aktif; halaman admin memanggil tanpa filter.
- **Response 200 OK:**
  ```json
  {
    "success": true,
    "data": [
      { "id": 1, "name": "Tunai (Cash)", "category": "CASH", "isActive": true },
      { "id": 2, "name": "QRIS BCA", "category": "THIRD_PARTY", "isActive": true },
      { "id": 3, "name": "EDC Mandiri", "category": "EDC", "isActive": true }
    ]
  }
  ```

### `POST /api/payment-channels` (Admin Only)
- **Request Body:** `{ "name": "ShopeePay QRIS", "category": "THIRD_PARTY" }` — `category` enum `CASH | THIRD_PARTY | EDC`.
- **Response 201 Created:** objek channel baru.
- **Error:** `400 INVALID_CATEGORY` (di luar enum)

### `PATCH /api/payment-channels/:id/toggle` (Admin Only)
- **Response 200 OK:** `{ "success": true, "data": { "id": 2, "name": "QRIS BCA", "isActive": false } }`
- **Error:** `404 CHANNEL_NOT_FOUND`

> **Integrasi POS:** `PaymentModal` kasir mengganti array metode hardcoded dengan `GET /api/payment-channels?isActive=true`.

---

## 6.6 Modul Dashboard Analitik & Target Omset (Fase 3 — realisasi)

> Kontrak beku lengkap + semantik agregasi ada di `docs/10_PHASE3_IMPLEMENTATION.md` §4 (sumber resmi). Ringkasan realisasi:

### `GET /api/dashboard/overview` (Admin Only)
- **Query Params (opsional):** `?month=9&year=2026&tzOffset=-420` (batas hari/bulan dihitung di zona `tzOffset`, default UTC).
- **Response 200 OK:**
  ```json
  {
    "success": true,
    "data": {
      "period": { "month": 9, "year": 2026 },
      "gender": { "male": 12, "female": 9, "unknown": 3 },
      "summary": { "totalRevenue": 21515000, "totalOrders": 5, "averageTicket": 4303000 },
      "dailyRevenue": [ { "date": "2026-09-17", "revenue": 1250000 } ],
      "bestSellers": [ { "productId": 3, "name": "Kopi Susu Gula Aren", "quantity": 42, "revenue": 294000 } ],
      "target": { "month": 9, "year": 2026, "targetAmount": 50000000, "achievedAmount": 21500000, "percent": 43 }
    }
  }
  ```
- Semantik terkunci: agregasi **PAID-only**; gender null → `unknown`; `summary` = `{ totalRevenue, totalOrders, averageTicket }` bulan terpilih (ATV = Math.round, 0 bila tanpa order); `dailyRevenue` tepat 7 entri zero-fill (`YYYY-MM-DD`, sum `grandTotal`); `bestSellers` maks 5 (sum quantity, urut desc, tie-break productId asc); `target` = objek atau `null` bila belum diset (`percent` = Math.round, target 0 → `percent: null`); semua nominal Number integer rupiah (BigInt dikonversi di service).

### `GET /api/targets` & `PUT /api/targets` (Admin Only)
- `GET /api/targets?month=&year=` (default bulan berjalan) → `{ success, data: { month, year, targetAmount: number | null } }`; belum diset = `null`, bukan 404.
- `PUT /api/targets` body `{ month, year, targetAmount }` — **upsert** unique `[month, year]`; validasi month 1–12, year 2000–2100, targetAmount 0–1e12; error `INVALID_MONTH`/`INVALID_YEAR`/`INVALID_TARGET_AMOUNT` (400). Tanpa DELETE (setting di-upsert).

### `GET /api/targets/recent?months=N` (Admin Only)
- `N` default 3, clamp 1–12 → `GET /api/targets/recent?months=6` mengembalikan hingga `N` baris terakhir **berurutan mundur dari bulan berjalan** (bulan tanpa target tetap muncul dengan `targetAmount: null`), urut dari bulan terbaru:
  ```json
  { "success": true, "data": [ { "month": 9, "year": 2026, "targetAmount": 12000000, "achievedAmount": 1407000, "percent": 12 } ] }
  ```
- `achievedAmount` = omset order PAID bulan tsb; `percent` = Math.round (target 0/null → `percent: null`). Dipakai widget "LAST 3 MONTHS" dashboard dan tabel "Recent months" `/dashboard/target`.

### `GET /api/orders/history` — param baru (auth, semua role)
- `&gender=L|P` (nilai lain → `INVALID_GENDER` 400; null gender ter-Exclude saat filter aktif) dan `&product=<nama parsial, insensitive>`.
- `&search=<teks>&searchBy=invoice|customer` — `searchBy` menentukan kolom pencarian (`invoiceNumber` | `customerName`, keduanya `contains` insensitive). **Tanpa `searchBy`** perilaku lama tetap: OR keduanya (drawer Order History kasir aman). Kombinasi dipakai dropdown Product/Invoice/Customer di `/dashboard/history`.

**Deviasi dari desain awal §6.6 lama (disadari, terdokumentasi di dok 10):** `POST /api/dashboard/targets` → `PUT /api/targets`; field `targetStatus` enum tidak ada (warna progress = keputusan presentasi FE dari `percent`); `genderDemographics` → `gender{male,female,unknown}`; export CSV dilakukan **client-side** di `/dashboard/history` (tanpa endpoint server).
