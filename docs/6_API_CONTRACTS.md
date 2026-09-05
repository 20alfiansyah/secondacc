# 6. API CONTRACTS & SPECIFICATIONS (API_CONTRACTS.MD)

Base URL: `http://localhost:3000/api`

---

## 6.1 Authentication

### `POST /api/auth/login`
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

---

## 6.2 Tables & Menu (Layar Kasir & Pelanggan)

### `GET /api/tables`
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
          "invoiceNumber": "INV-20260905-0045",
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
- **Query Params:** `?category_id=1&search=nasi&is_available=true`
- **Response 200 OK:**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": 10,
        "name": "Nasi Goreng Spesial",
        "price": 28000,
        "categoryId": 2,
        "categoryName": "Makanan Berat",
        "description": "Nasi goreng telur + ayam suwir",
        "isAvailable": true
      }
    ]
  }
  ```

### `PATCH /api/products/:id/toggle-availability`
- **Response 200 OK:**
  ```json
  {
    "success": true,
    "data": {
      "id": 10,
      "name": "Nasi Goreng Spesial",
      "isAvailable": false
    }
  }
  ```

---

## 6.3 Orders, Open Bill, & Checkout

### `GET /api/orders`
- **Deskripsi:** Daftar order, difilter berdasarkan status (mis. `OPEN_BILL` untuk kartu RECENT ORDERS atau `PAID` untuk riwayat transaksi). Diurutkan `createdAt` menurun.
- **Query Params:** `?status=PAID` (`OPEN_BILL` | `PAID` | `CANCELLED`; opsional)
- **Response 200 OK:**
  ```json
  {
    "success": true,
    "orders": [
      {
        "id": 45,
        "invoiceNumber": "INV-20260905-0045",
        "status": "PAID",
        "tableId": 1,
        "tableNumber": "Meja 01",
        "customerName": "Budi",
        "customerGender": "L",
        "paymentMethod": "Tunai",
        "subtotal": 56000,
        "grandTotal": 56000,
        "itemCount": 2,
        "createdAt": "2026-09-05T20:15:00Z"
      }
    ]
  }
  ```

### `GET /api/orders/:id`
- **Deskripsi:** Detail lengkap satu order, termasuk item (dengan nama produk & harga per item) dan data pembayaran — dipakai untuk panel ORDER DETAIL dan re-print struk.
- **Response 200 OK:**
  ```json
  {
    "success": true,
    "order": {
      "id": 45,
      "invoiceNumber": "INV-20260905-0045",
      "status": "PAID",
      "customerName": "Budi",
      "customerGender": "L",
      "tableId": 1,
      "tableNumber": "Meja 01",
      "subtotal": 56000,
      "grandTotal": 56000,
      "createdAt": "2026-09-05T20:15:00Z",
      "items": [
        {
          "productName": "Nasi Goreng Spesial",
          "quantity": 2,
          "unitPrice": 28000,
          "subtotal": 56000,
          "notes": "Pedas sedang"
        }
      ],
      "payment": {
        "category": "CASH",
        "methodName": "Tunai",
        "amountPaid": 100000,
        "changeDue": 44000,
        "paidAt": "2026-09-05T20:16:00Z"
      }
    }
  }
  ```

### `POST /api/orders/open-bill`
- **Deskripsi:** Kasir menyimpan pesanan sementara ke meja (status `OPEN_BILL`).
- **Request Body:**
  ```json
  {
    "tableId": 1,
    "items": [
      {
        "productId": 10,
        "quantity": 2,
        "notes": "Pedas sedang"
      }
    ]
  }
  ```
- **Response 201 Created:**
  ```json
  {
    "success": true,
    "order": {
      "id": 45,
      "invoiceNumber": "INV-20260905-0045",
      "tableId": 1,
      "status": "OPEN_BILL",
      "subtotal": 56000,
      "grandTotal": 56000
    }
  }
  ```

### `POST /api/orders/:id/checkout`
- **Deskripsi:** Menyelesaikan pembayaran, menginput gender pelanggan (P/L), dan mengosongkan meja.
- **Request Body:**
  ```json
  {
    "customerGender": "L",
    "payment": {
      "category": "CASH",
      "methodName": "Tunai",
      "amountPaid": 100000
    }
  }
  ```
- **Response 200 OK:**
  ```json
  {
    "success": true,
    "order": {
      "id": 45,
      "invoiceNumber": "INV-20260905-0045",
      "status": "PAID",
      "customerGender": "L",
      "grandTotal": 56000,
      "payment": {
        "category": "CASH",
        "methodName": "Tunai",
        "amountPaid": 100000,
        "changeDue": 44000,
        "paidAt": "2026-09-05T20:15:00Z"
      }
    }
  }
  ```

### `PATCH /api/orders/:id/cancel`
- **Deskripsi:** Membatalkan pesanan Open Bill (jika pelanggan batal) dan otomatis melepaskan meja menjadi kosong.
- **Response 200 OK:**
  ```json
  {
    "success": true,
    "message": "Pesanan berhasil dibatalkan dan meja telah dikosongkan.",
    "order": {
      "id": 45,
      "status": "CANCELLED"
    }
  }
  ```

---

## 6.4 Dashboard & Analytics (Khusus Admin)

### `GET /api/dashboard/overview?month=9&year=2026`
- **Deskripsi:** Mengembalikan seluruh data untuk **4 Grid Dashboard**:
- **Response 200 OK:**
  ```json
  {
    "success": true,
    "data": {
      "grid1_pie_gender": {
        "female_count": 142,
        "female_percentage": 56.8,
        "male_count": 108,
        "male_percentage": 43.2
      },
      "grid2_bar_revenue": {
        "filter": "LAST_7_DAYS",
        "data": [
          { "date": "2026-08-30", "total_sales": 1450000 },
          { "date": "2026-08-31", "total_sales": 1920000 },
          { "date": "2026-09-01", "total_sales": 2300000 },
          { "date": "2026-09-02", "total_sales": 1780000 },
          { "date": "2026-09-03", "total_sales": 2100000 },
          { "date": "2026-09-04", "total_sales": 2850000 },
          { "date": "2026-09-05", "total_sales": 3200000 }
        ]
      },
      "grid3_best_sellers": [
        { "id": 1, "name": "Kopi Susu Kafe", "qty_sold": 210, "revenue": 3780000 },
        { "id": 10, "name": "Nasi Goreng Spesial", "qty_sold": 145, "revenue": 4060000 },
        { "id": 4, "name": "Kentang Goreng", "qty_sold": 98, "revenue": 1470000 }
      ],
      "grid4_target_progress": {
        "current_revenue": 35600000,
        "target_revenue": 50000000,
        "percentage": 71.2,
        "indicator": "RED" // "RED" jika < target, "YELLOW" jika == target, "GREEN" jika > target
      }
    }
  }
  ```

### `POST /api/dashboard/target`
- **Request Body:**
  ```json
  {
    "month": 10,
    "year": 2026,
    "targetAmount": 60000000
  }
  ```
- **Response 200 OK:**
  ```json
  {
    "success": true,
    "data": {
      "month": 10,
      "year": 2026,
      "targetAmount": 60000000
    }
  }
  ```

### `GET /api/dashboard/history`
- **Query Params:** `?page=1&limit=20&start_date=2026-09-01&end_date=2026-09-05&gender=L&product_id=10`
- **Response 200 OK:**
  ```json
  {
    "success": true,
    "total": 45,
    "orders": [
      {
        "id": 45,
        "invoiceNumber": "INV-20260905-0045",
        "tableNumber": "Meja 01",
        "cashierName": "Siti Kasir",
        "customerGender": "L",
        "paymentMethod": "CASH",
        "grandTotal": 56000,
        "createdAt": "2026-09-05T20:15:00Z"
      }
    ]
  }
  ```
