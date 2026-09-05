#!/bin/sh
set -e

# Jalankan migrasi database. Karena tidak ada folder migrations, gunakan
# `prisma db push --accept-data-loss` untuk menyinkronkan schema Prisma
# ke PostgreSQL secara non-interaktif. Opsional: set SKIP_DB_PUSH=1 untuk
# melewati (misal DB sudah di-manage terpisah).
if [ "${SKIP_DB_PUSH:-0}" != "1" ]; then
  echo "⏳ Applying Prisma schema (db push)..."
  npx prisma db push --accept-data-loss
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
