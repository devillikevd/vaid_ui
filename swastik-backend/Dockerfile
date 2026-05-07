# SWASTIK Backend Dockerfile — Production (AWS App Runner)
# Multi-stage build for minimal image size and attack surface

# ── Stage 1: Install production dependencies ──
FROM node:20-alpine AS deps
WORKDIR /app

# Add tini for proper PID 1 signal handling in containers
RUN apk add --no-cache tini

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

# ── Stage 2: Production runtime ──
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Tini ensures graceful shutdown (SIGTERM → child processes)
COPY --from=deps /sbin/tini /sbin/tini

# Copy only production node_modules (no devDependencies)
COPY --from=deps /app/node_modules ./node_modules

# Copy application source
COPY . .

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs && \
    chown -R nodejs:nodejs /app

USER nodejs

# AWS App Runner injects PORT env var; default to 5001 for local dev
EXPOSE ${PORT:-5001}

# Health check — used by App Runner & Docker Compose
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-5001}/health || exit 1

# Tini as entrypoint for clean signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# Start the application
CMD ["node", "server.js"]
