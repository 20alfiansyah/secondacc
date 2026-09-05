# ---- Build stage ----
FROM node:20-alpine AS build
WORKDIR /app

# Cache node_modules terlebih dahulu
COPY package*.json ./
RUN npm ci

# Salin source & build
# (node_modules penuh dipertahankan: entrypoint memakai prisma CLI & ts-node
#  untuk `db push` + seed, yang merupakan devDependencies.)
COPY . .
RUN npx prisma generate \
  && npm run build

# ---- Production stage ----
FROM node:20-alpine AS production
ENV NODE_ENV=production
WORKDIR /app

# Jalankan sebagai user non-root
RUN addgroup -S app && adduser -S app -G app

COPY --from=build --chown=app:app /app/node_modules ./node_modules
COPY --from=build --chown=app:app /app/package.json ./package.json
COPY --from=build --chown=app:app /app/dist ./dist
COPY --from=build --chown=app:app /app/prisma ./prisma

# Entrypoint: jalankan migrasi + seed (opsional) lalu start server
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000
USER app
ENTRYPOINT ["docker-entrypoint.sh"]
# Note: `nest build` dengan tsconfig ini menghasilkan dist/src/main.js
CMD ["node", "dist/src/main.js"]
