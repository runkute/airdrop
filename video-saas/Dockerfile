# syntax=docker/dockerfile:1
FROM node:20-alpine AS base

# ffmpeg  — video rendering
# openssl — Prisma engine on Alpine
# libc6-compat — Node.js native addons
RUN apk add --no-cache ffmpeg openssl libc6-compat

# ── 1. Install dependencies ──────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY package*.json ./
# Install ALL deps (incl. devDeps) so tsx + prisma CLI are available
RUN npm ci

# ── 2. Generate Prisma client + build Next.js ────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ── 3. Production image (Next.js web server) ────────────────────────────────
FROM base AS app
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./
COPY --from=builder /app/tsconfig*.json ./

EXPOSE 3000
# Run DB migrations, then start Next.js
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]

# ── 4. Worker image (BullMQ + FFmpeg renderer) ───────────────────────────────
FROM base AS worker
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./
COPY --from=builder /app/tsconfig*.json ./
COPY --from=builder /app/package*.json ./

CMD ["npm", "run", "worker"]
