# ---- Build stage ----
# Full node image has the python3/make/g++ toolchain that better-sqlite3
# needs to compile its native binding.
FROM node:20-bookworm AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .
RUN npm run build

# ---- Runtime stage ----
FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Next.js "standalone" output bundles only the files the server needs.
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# App data (SQLite database + uploaded bill photos) lives here.
# Mount a persistent volume at /app/data so it survives restarts/redeploys.
RUN mkdir -p /app/data
VOLUME ["/app/data"]

EXPOSE 3000
CMD ["node", "server.js"]
