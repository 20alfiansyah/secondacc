-- Soft-disable kategori: arsip tanpa hapus (riwayat order tetap utuh).
ALTER TABLE "categories" ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;
