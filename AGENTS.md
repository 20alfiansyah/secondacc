# AGENTS.MD - AI AGENT CONSTITUTION & PROTOCOL

> **Single Source of Truth untuk AI Coding Agent di Project POS ini.**
> File ini menggabungkan filosofi **Ponytail** (KISS & YAGNI) dan **Superpowers** (Disiplin TDD & Verifikasi Sistematis).

---

## 1. THE PONYTAIL PROTOCOL (Pragmatism & Simplicity)
- **YAGNI (You Ain't Gonna Need It):** Jangan pernah menulis kode, modul, atau konfigurasi untuk "kemungkinan di masa depan". Tulis HANYA apa yang diminta oleh task saat ini.
- **KISS (Keep It Simple, Stupid):** Gunakan solusi paling sederhana, ringkas, dan minim baris yang menyelesaikan masalah secara benar.
- **No Premature Abstraction:** Dilarang membuat 5 layer interface/wrapper jika sebuah fungsi atau repository sederhana sudah cukup.
- **Duplication is Cheaper than Wrong Abstraction:** Jangan satukan dua logika bisnis yang berbeda ke dalam satu fungsi generic yang rumit.

---

## 2. THE SUPERPOWERS PROTOCOL (Rigorous Engineering & TDD)
- **Plan Before Code:** Sebelum mengubah kode apa pun, sebutkan langkah spesifik yang akan diambil dan file mana saja yang akan diedit.
- **Test-Driven Discipline:**
  - Setiap logika perhitungan keuangan (subtotal, diskon persentase, diskon nominal, pajak PPN, pembulatan/rounding) **WAJIB** memiliki Unit Test.
  - Setiap mutasi stok **WAJIB** diuji dengan skenario normal dan skenario gagal (stok tidak cukup).
- **Systematic Debugging:** Jika terjadi bug, cari tahu *akar masalahnya* terlebih dahulu. Dilarang menebak-nebak atau membungkus kode error dengan `try-catch` kosong.
- **No Done Without Proof:** Task di `docs/7_ROADMAP_TASKS.md` TIDAK BOLEH dicentang `[x]` sebelum verifikasi test dan build/linter berhasil 100%.

---

## 3. POS FINANCIAL & TRANSACTION GUARDRAILS (CRITICAL)
- **MONEY ACCURACY:** DILARANG menggunakan tipe data floating-point (`float`, `double`) untuk nominal uang. Gunakan integer (satuan sen / rupiah bulat terkecil) atau library Decimal untuk menghindari bug pembulatan (`0.1 + 0.2 != 0.3`).
- **ATOMIC TRANSACTIONS:** Setiap proses checkout dan pembayaran wajib dieksekusi di dalam **Database Transaction** (ACID):
  - *Insert Order + Insert Items + Deduct Stock + Record Payment + Record Shift Log* harus sukses bersamaan, atau rollback total jika ada 1 langkah yang gagal.
- **IMMUTABLE AUDIT TRAIL:** Data transaksi dan riwayat mutasi stok bersifat *append-only*. Dilarang melakukan hard-delete pada transaksi yang sudah selesai. Pembatalan/retur dicatat sebagai transaksi pembalik (refund order).

---

## 4. ANTI-SLOP BLACKLIST (STRICT)
1. **NO FAKE TESTS:** Dilarang membuat test yang hanya `expect(true).toBe(true)` atau sekadar mock kosong tanpa pengujian logika nyata.
2. **NO DUPLICATE HELPERS:** Sebelum membuat utility function (seperti format rupiah, parsing tanggal), periksa folder `utils/` atau `core/` yang sudah ada.
3. **NO ANY / DYNAMIC TYPES:** Dilarang menggunakan `any` tanpa alasan teknis mendesak yang terdokumentasi.
4. **NO SILENT FAILURES:** Jangan pernah menangkap exception tanpa logging atau penanganan yang jelas (`catch (e) {}` is strictly forbidden).

---

## 5. REPOSITORY CADENCE & WORKFLOW
1. **Source of Truth:** Baca `docs/1_PRD.md`, `docs/4_ARCHITECTURE.md`, dan `docs/5_DATABASE.md` untuk memahami konteks sebelum koding.
2. **One Task at a Time:** Ambil 1 checklist atomic dari `docs/7_ROADMAP_TASKS.md`.
3. **The 3-Strike Rule:** Jika AI gagal memperbaiki error setelah 2 kali percobaan, berhentilah menambal. Lakukan rollback (`git reset --hard`) dan gunakan pendekatan baru yang lebih bersih.
4. **Clean Context:** Buat sesi chat baru saat berganti modul besar untuk menjaga kebersihan context window.
