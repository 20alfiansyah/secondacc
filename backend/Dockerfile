# ---- Build stage: full dev deps, compile app + seed ----
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY . .
# dist = app (nest build), dist-seed = seed hasil compile CommonJS
# (runtime tanpa ts-node: prisma db seed dijalankan dari dist-seed).
RUN npm run build \
  && npx tsc -p tsconfig.seed.json

# ---- Deps stage: produksi saja + prisma client tergenerate ----
FROM node:20-alpine AS deps
WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma
# prisma CLI kini dependencies (dipakai entrypoint untuk `migrate deploy`).
RUN npm ci --omit=dev \
  && npm cache clean --force \
  && npx prisma generate

# ---- Production stage: image ramping, non-root ----
FROM node:20-alpine AS production
ENV NODE_ENV=production
WORKDIR /app

# Jalankan sebagai user non-root
RUN addgroup -S app && adduser -S app -G app

COPY --from=deps --chown=app:app /app/node_modules ./node_modules
COPY --from=build --chown=app:app /app/package.json ./package.json
COPY --from=build --chown=app:app /app/dist ./dist
COPY --from=build --chown=app:app /app/dist-seed ./dist-seed
COPY --from=build --chown=app:app /app/prisma ./prisma

# Folder upload dibuat SEBELUM drop privilege, owned app:app —
# multer (mkdirp) & ServeStaticModule tidak butuh mkdir runtime (EACCES non-root).
RUN mkdir -p /app/uploads/products && chown -R app:app /app/uploads

# Entrypoint: jalankan migrasi + seed (opsional) lalu start server
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
# Sanitasi CRLF (checkout Windows) agar shebang valid di Alpine, lalu executable.
RUN sed -i 's/\r$//' /usr/local/bin/docker-entrypoint.sh \
  && chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000
USER app
ENTRYPOINT ["docker-entrypoint.sh"]
# Note: `nest build` dengan tsconfig ini menghasilkan dist/src/main.js
CMD ["node", "dist/src/main.js"]
