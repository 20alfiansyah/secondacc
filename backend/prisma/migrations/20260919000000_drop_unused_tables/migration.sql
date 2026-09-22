-- Hasil audit 19 Sep 2026: hapus fitur yang tidak dipakai frontend
-- (modul tables, MonthlyTarget, PaymentChannel, Role INVENTORY, Order.tableId).
-- Urutan: lepas FK/index/kolom di orders lebih dulu, baru drop tabel "tables".

ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "orders_table_id_fkey";
DROP INDEX IF EXISTS "orders_table_id_idx";
ALTER TABLE "orders" DROP COLUMN IF EXISTS "table_id";

-- Postgres tidak mendukung ALTER TYPE ... DROP VALUE; ganti enum dengan tipe
-- baru. Gagal-berisik bila masih ada user ber-role 'INVENTORY' (disengaja —
-- konversi diam-diam bukan keputusan yang boleh diambil migration).
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
CREATE TYPE "Role_new" AS ENUM ('ADMIN', 'CASHIER');
ALTER TABLE "users" ALTER COLUMN "role" TYPE "Role_new" USING "role"::text::"Role_new";
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'CASHIER';
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "Role_old";

DROP TABLE IF EXISTS "monthly_targets";
DROP TABLE IF EXISTS "payment_channels";
DROP TABLE IF EXISTS "tables";
