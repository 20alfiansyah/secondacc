#!/bin/sh
set -e

# Terapkan migrasi Prisma. Folder prisma/migrations wajib ter-commit di repo;
# skema TIDAK lagi disinkronkan via `db push` di produksi.
# Catatan one-time untuk database lama yang dibuat via `db push`:
#   npx prisma migrate resolve --applied 20260912000000_init
# Set SKIP_MIGRATE=1 untuk melewati (mis. DB di-manage terpisah).
if [ "${SKIP_MIGRATE:-0}" != "1" ]; then
  echo "⏳ Applying Prisma migrations..."
  npx prisma migrate deploy
fi

# Seed data awal (opsional). Set SKIP_SEED=1 untuk melewati.
# Jalankan via ts-node/register dengan modul CommonJS paksa, agar kompatibel
# dengan Node 20 / ESM resolution dalam image (tanpa ini seed error
# "Unknown file extension .ts").
if [ "${SKIP_SEED:-0}" != "1" ]; then
  echo "🌱 Seeding database..."
  TS_NODE_COMPILER_OPTIONS='{"module":"commonjs"}' \
    node -r ts-node/register prisma/seed.ts
fi

# Panggil command utama (node dist/main.js)
exec "$@"
