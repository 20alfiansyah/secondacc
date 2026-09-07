# 2. DETAILED REQUIREMENTS & BUSINESS RULES (REQUIREMENTS.MD)

> **Main Specification Document:** Full 31-chapter technical specifications are maintained in [PRD_MASTER.md](file:///f:/Project/secondacc/docs/PRD_MASTER.md) and [1_PRD.md](file:///f:/Project/secondacc/docs/1_PRD.md).

---

## 2.1 Cashier / POS Screen Layout (`/pos`) - Modern Minimalist POS

The POS screen adopts a world-class, ergonomic 3-zone architecture: **Slim Left Navigation Rail (~64px)**, **Center Work Area (Active Orders Queue + Menu Catalog)**, and **Right Order Details Panel (~380px)**:

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

---

### A. Zone 1: Slim Left Navigation Rail (~64px)

Designed specifically for the Cashier role (cashiers do not access the Admin Dashboard):
1. **Top Brand Anchor:** Minimalist cafe logo icon.
2. **Primary Navigation Icons (with Tooltips):**
   - **`[ 🏪 Register / POS ]` (Active):** The primary transaction screen.
   - **`[ 🧾 Order History ]`:** Opens the **Slide-Over Drawer** displaying completed transactions with instant search, date filters, and **1-tap Reprint Receipt** (`window.print()`) without leaving the active register!
3. **Bottom Cashier Profile & Shift Widget:**
   - Cashier Avatar button (`👤 Siti`).
   - Clicking triggers a popup menu:
     - Cashier session info (e.g. *Siti • Cashier*)
     - Switch Cashier / Lock Register
     - **Sign Out / Logout** (terminates JWT session)

---

### B. Zone 2: Center Main Work Area (Active Orders Line + Menu Catalog)

#### 1. Top Section: "Active Orders Line" (Persistent Queue)
- **Always Visible (Persisted):** Placed directly above the menu grid. Changing categories or searching menu items **never** hides or resets the Active Orders Line.
- **Section Header & Simplified Filter Pills:**
  - Section Title: **`Active Orders (count)`** with Search Bar on the right.
  - Placed directly underneath the title:
    - **`[ All ]`** — All active pending tickets.
    - **`[ Dine In ]`** — Only dine-in orders.
    - **`[ Takeaway ]`** — Only takeaway pickup orders.
- **Dedicated Orders Search Bar:** Instant search by Order ID (e.g. "#045") or Customer Name (e.g. "Rian").
- **Horizontal Carousel (`<` `>` Navigation):**
  - Displays compact cards:
    - **Order ID:** e.g. `Order #045` (Daily Ticket Sequence)
    - **Service Badge:** `[ Dine In ]` or `[ Takeaway ]`
    - **Customer Name:** e.g. `Rian`
    - **Item Count & Total:** e.g. `3 items • Rp 65,000`
  - **Operational Meaning:**
    - Minuman / Kopi: Ditunggu langsung di counter oleh pelanggan.
    - Makanan berat / snack: Diantar oleh pelayan ke meja pelanggan dengan memanggil nama / Order ID yang tertera di struk.
  - **1-Click Interaction:** Tapping any card instantly loads the order into the right **Order Details** panel to add more items or process payment. When paid, card automatically disappears from queue.

#### 2. Bottom Section: Menu Catalog Grid with Category Bubbles
- **Section Header & Category Filter Pills (Clean Minimalism, No Generic Emojis):**
  - Section Title: **`Menu Catalog (count)`** with live product search bar on the right.
  - Placed directly underneath the title:
    - Clean horizontal text pills: **`[ All ]` `[ Recommended ⭐ ]` `[ Best Seller 🔥 ]` `[ Coffee ]` `[ Mocktails ]` `[ Non-Coffee ]` `[ Main Course ]` `[ Snacks & Pastry ]`**.
    - Kategori standar murni berupa teks bersih tanpa emoji berlebihan (mengikuti prinsip minimalis modern).
    - Emoji dan highlight visual **HANYA** digunakan secara eksklusif untuk menu yang **Recommended (`⭐`)** dan **Best Seller (`🔥`)**.
- **Category Overflow Handling (Jika Kafe Memiliki Banyak Kategori / 10+ Katalog):**
  - **Prinsip Fixed 1-Baris (Single-Row Carousel):** Deretan kategori **DILARANG bertumpuk ke bawah (no multi-line wrap)** agar tinggi layar tidak tersita dan katalog makanan tidak terdorong ke bawah.
  - **Horizontal Smooth Scroll & Arrow Controls:** Menggunakan touch swipe (layar sentuh), roda mouse, dan panah navigasi halus `[ < ]` `[ > ]` di ujung baris.
  - **Quick Category Popover Grid (`[ 📑 Categories ▼ ]`):** Tombol ringkas di samping panah. Jika diklik, membuka popover compact yang menampilkan seluruh daftar kategori dalam format grid (3 kolom) untuk lompat langsung ke kategori mana pun dalam 1 klik tanpa perlu scrolling.
  - **Section Grouping pada Tab `[ All ]` (Visual Category Sections):**
    - Saat tab `[ All ]` aktif, produk **tidak dicampur aduk acak**, melainkan dikelompokkan berdasarkan kategorinya dengan **Header Section yang jelas**:
      - `⭐ RECOMMENDED & BEST SELLER (4 items)`
      - `COFFEE (12 items)`
      - `MOCKTAILS (6 items)`
      - `NON-COFFEE (8 items)`
      - `MAIN COURSE (10 items)`
      - `SNACKS & PASTRY (7 items)`
    - Setiap header section dilengkapi garis pemisah halus dan indikator jumlah item, memberikan orientasi visual instan bagi kasir saat scrolling.
    - Jika kasir mengklik tab kategori spesifik (misal `Mocktails`), katalog hanya menampilkan grid produk kategori tersebut secara fokus.
  - Food & beverage cards with sharp photos, rounded corners (`rounded-xl`), subtle borders, item title, and clean integer Rupiah price (e.g. `Rp 28,000`).
  - **Exclusive Highlight Badges:**
    - Jika `isRecommended == true`: badge elegan **`[ ⭐ Recommended ]`** di pojok foto produk.
    - Jika `isBestSeller == true`: badge elegan **`[ 🔥 Best Seller ]`** di pojok foto produk.
    - Menu biasa tampil bersih tanpa badge apa pun agar mata kasir tidak terdistraksi.
  - Status badge if *Sold Out* (card disabled, grayscale overlay).
  - **Clicking ANY menu card opens the Guided Item Customization Modal**:
    - Memberikan alur kasir yang terpandu (*guide-able*) sehingga kasir tidak pernah lupa menanyakan level gula/es/pedas dan catatan khusus sebelum memasukkan ke keranjang.

```text
┌─────────────────────────────────────────────────────────────┐
│  Item Customization                                     [✕] │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────┐  Brown Sugar Latte                            │
│  │ [Photo]  │  Rp 20,000 • Coffee                           │
│  └──────────┘  Single origin espresso + fresh milk + aren   │
├─────────────────────────────────────────────────────────────┤
│  Quantity:                                                  │
│  ┌───────┐             ┌─────────────┐             ┌───────┐│
│  │  [-]  │             │      1      │             │  [+]  ││
│  └───────┘             └─────────────┘             └───────┘│
├─────────────────────────────────────────────────────────────┤
│  Sugar Level:                                               │
│  [ Less Sugar ]    [ Normal Sugar (✓) ]    [ No Sugar ]     │
│                                                             │
│  Ice Level:                                                 │
│  [ Less Ice ]      [ Normal Ice (✓) ]      [ No Ice ]       │
├─────────────────────────────────────────────────────────────┤
│  Kitchen Notes (Opsional):                                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ e.g. Pisah sedotan, gelas plastik, dll.                │ │
│  └────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Add to Order • Rp 20,000 (Enter ↵)                     │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

### C. Zone 3: Right Order Details Panel (~380px)

1. **Order Header:**
   - **When ringing up new customer:** Displays `New Order (Order #045)` and current date/time.
   - **When clicking an active open bill:** Displays `Viewing Order #042 (Open Bill)` with a clear **`[ ✕ New Order ]`** button to reset the panel back to a fresh ticket for the next customer without affecting the open bill.
2. **Order Type Segmented Control:**
   - **`[ Dine In ]`** (Makan di tempat) vs **`[ Takeaway ]`** (Bungkus bawa pulang).
3. **Customer Name Input (Wajib / Mandatory):**
   - Single input field: e.g. "Rian", "Ibu Maya".
   - **Wajib diisi:** Tidak bisa checkout atau save open bill jika nama kosong, menjamin pesanan selalu memiliki nama saat kopi dipanggil di bar atau makanan diantar ke meja.
4. **Ordered Items List:**
   - Clean item cards: item name, price, inline quantity stepper, delete icon (`Trash`).
   - Custom notes displayed beneath the item name (e.g. *Note: [Less sugar, less ice]*). Cashier can click anytime to re-edit.
5. **Quick Demographics Gender Selector (1-Click):**
   - Toggle buttons: **`[ 👨 Male (L) ]`** and **`[ 👩 Female (P) ]`**.
   - Mencatat profil demografi **siapa yang membayar di meja kasir (*payer's gender*)**.
6. **Financial Summary:**
   - Subtotal and Grand Total calculated with integer precision.
7. **Unified Checkout Actions:**
   - **Primary Action (Solid Button):**
     - **`[ Pay Now • Rp 48,000 → ]`**
     - Prominently displays the total amount due. Opens the fast payment modal: Cash with quick cash buttons (Exact, 20k, 50k, 100k + auto-change), QRIS, EDC card machine. Begitu lunas, tiket **otomatis selesai dan hilang dari antrean Active Orders**.
   - **Secondary Action (Outline Button):**
     - **`[ Save Open Bill ]`**
     - Saves the order (`status = OPEN_BILL`). Tiket langsung masuk ke antrean **Active Orders Line** di atas katalog menu. Panel kanan kembali bersih untuk transaksi berikutnya.

---

## 2.2 Slide-Over Drawer: Order History & Reprint Receipt

- Clicking the `[ 🧾 Order History ]` icon on the left rail slides in a dedicated panel from the right without leaving or reloading the POS register screen.
- Features:
  - Search by invoice number or customer name.
  - Date range filter.
  - Table of completed transactions (`status = PAID`).
  - **`[ Reprint Receipt ]` Button:** Instantly opens the digital receipt preview and triggers browser print (`window.print()`).

---

## 2.3 Stock Rules: "Available / Sold Out" (KISS & Ponytail)
- No complex ingredient grammage deduction.
- Each product has an `isAvailable` boolean flag (Default: `true`).
- Cashiers or Admins can toggle status to `false` (*Sold Out*) with a single tap if stock runs out.

---

## 2.4 Admin Dashboard Summary (`/dashboard`)
*(Accessible only by users with role `ADMIN` via direct URL or Admin login)*
1. **Grid 1 (Pie Chart):** Monthly customer gender demographics (Male vs Female).
2. **Grid 2 (Bar Chart):** Revenue trends (Last 7 Days & Monthly).
3. **Grid 3 (Leaderboard):** Top 5 Best Selling menu items.
4. **Grid 4 (Progress Bar):** Monthly revenue target vs actual with color status (🔴 Red < 70%, 🟡 Yellow 70-99%, 🟢 Green $\ge$ 100%).

---

## 2.5 Responsive Layout & Breakpoint Specifications (Hardware Ergonomics)

Desain POS mendukung berbagai perangkat keras kafe, mulai dari mesin All-in-One Touch POS desktop, iPad/Tablet Android, hingga smartphone:

| Breakpoint | Target Perangkat | Layout Komponen POS | Grid Menu |
| :--- | :--- | :--- | :---: |
| **Desktop / AIO POS**<br>($\ge 1280\text{px}$) | Desktop PC, Touch POS 15.6" - 21.5" (Sunmi T2, iMin, PC Kasir) | **3-Zone Penuh Berdampingan**<br>- Left Rail: `64px`<br>- Center: Fluid width (Active Orders 4–5 kartu)<br>- Right Panel: `380px` fixed | **4 Kolom** |
| **Tablet Landscape**<br>($1024\text{px} - 1279\text{px}$)<br>*(Primary Device)* | iPad 10.2", iPad Air 10.9", Samsung Galaxy Tab | **3-Zone Ringkas Berdampingan**<br>- Left Rail: `56px`<br>- Center: Fluid width (Active Orders 3 kartu)<br>- Right Panel: `320px - 340px` ringkas<br>*(Semua zona tetap berdampingan tanpa perlu toggle)* | **3 Kolom** |
| **Tablet Portrait**<br>($768\text{px} - 1023\text{px}$) | iPad Portrait, iPad Mini | **Adaptive Split / Floating Cart Sheet**<br>- Left Rail: `48px` atau Bottom Nav<br>- Center: Full width<br>- Right Panel: Menjadi **Floating Bottom Dock** (`[ 🛒 3 items • Rp 53.000 ] [ Review & Pay → ]`) yang jika di-tap membuka panel keranjang (*Slide-Up Sheet*) | **3 Kolom** |
| **Mobile Screen**<br>($< 768\text{px}$) | Smartphone kasir / mobile order taking | **Full Mobile View**<br>- Bottom Floating Cart Bar<br>- Modal kustomisasi full screen bottom sheet | **2 Kolom** |

### Standar Ergonomi Touchscreen:
1. **Minimum Touch Target Size:** Seluruh tombol aksi, stepper `[-]` / `[+]`, pill kategori, dan kartu pesanan memiliki area sentuh minimal **$44 \times 44\text{px}$** (sesuai standar Apple HIG dan Google Material Design) agar kasir tidak salah pencet.
2. **Prevent Image Distortion:** Seluruh foto produk menggunakan rasio aspek konsisten `aspect-square` ($1:1$) atau $4:3$ dengan properti `object-cover`.
3. **Pemberitahuan Keyboard Virtual:** Input teks nama pelanggan tidak mendorong atau merusak layout saat virtual keyboard muncul pada layar tablet.
