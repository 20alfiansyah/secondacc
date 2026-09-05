# ---- Build stage ----
FROM node:20-alpine AS build
WORKDIR /app

# Cache node_modules
COPY package*.json ./
RUN npm ci

# Salin source & build
COPY . .
RUN npm run build

# ---- Production stage: serve dengan nginx ----
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
