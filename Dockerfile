# syntax=docker/dockerfile:1

# ── Build stage ──────────────────────────────────
FROM node:20-slim AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/
COPY public/ ./public/

RUN npm run build

# ── Production stage ─────────────────────────────
FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled server
COPY --from=build /app/dist ./dist

# Copy public assets (HTML, CSS, JS, images)
COPY --from=build /app/public ./public

# Data directory for SQLite (will be a Fly volume)
RUN mkdir -p /data

EXPOSE 8080

CMD ["node", "dist/server.js"]
