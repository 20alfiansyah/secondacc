#!/bin/sh
set -e

# Terapkan migrasi Prisma. Folder prisma/migrations wajib ter-commit di repo;
# skema TIDAK lagi disinkronkan via `db push` di produksi.
# Catatan one-time untuk database lama yang dibuat via `db push`:
#   npx prisma migrate resolve --applied 20260912000000_init
# Set SKIP_MIGRATE=1 untuk melewati (mis. DB di-manage terpisah).
# Kredensial seed wajib sebelum migrate/seed jalan — menggantikan guard
# `${VAR:?}` yang dulu ada di docker-compose.yml (false positive GitGuardian).
if [ "${SKIP_SEED:-0}" != "1" ] && { [ -z "${SEED_ADMIN_PASSWORD:-}" ] || [ -z "${SEED_CASHIER_PASSWORD:-}" ]; }; then
  echo "ERROR: SEED_ADMIN_PASSWORD dan SEED_CASHIER_PASSWORD wajib diisi di .env" >&2
  echo "       (atau set SKIP_SEED=1 bila DB sudah berisi data)." >&2
  exit 1
fi

if [ "${SKIP_MIGRATE:-0}" != "1" ]; then
  echo "⏳ Applying Prisma migrations..."
  npx prisma migrate deploy
fi

# Seed data awal (opsional). Set SKIP_SEED=1 untuk melewati.
# Memakai seed hasil compile (dist-seed/seed.js) — runtime image TIDAK punya
# ts-node. Seed membaca SEED_ADMIN_PASSWORD / SEED_CASHIER_PASSWORD dari env.
if [ "${SKIP_SEED:-0}" != "1" ]; then
  echo "🌱 Seeding database..."
  node dist-seed/seed.js
fi

# Panggil command utama (node dist/main.js)
exec "$@"
