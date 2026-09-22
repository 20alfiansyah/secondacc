-- Soft-archive produk: "hapus" = arsip (is_active=false), riwayat order tetap utuh.
ALTER TABLE "products" ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;
