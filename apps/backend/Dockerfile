# ── Stage 1: Build ─────────────────────────────────────────────────────────────
FROM node:22-slim AS builder

WORKDIR /app

# Install system dependencies (OpenSSL is required by Prisma)
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    && rm -rf /var/lib/apt/lists/*

# Copy package manifests and Prisma schema
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (including devDependencies needed for build)
RUN npm install

# Generate Prisma Client
RUN npx prisma generate

# Copy TypeScript config and source code
COPY tsconfig.json ./
COPY src ./src/

# Compile TypeScript to dist/
RUN npm run build

# ── Stage 2: Production Runner ────────────────────────────────────────────────
FROM node:22-slim AS runner

WORKDIR /app

# Install runtime dependencies (OpenSSL for Prisma engine, curl for healthcheck)
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    curl \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    PORT=4000

# Copy package files and install production dependencies only
COPY package*.json ./
RUN npm install --omit=dev

# Copy generated Prisma schema and client
COPY prisma ./prisma/
RUN npx prisma generate

# Copy compiled JavaScript from builder stage
COPY --from=builder /app/dist ./dist

# Copy entrypoint script
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Create directory for file uploads with appropriate permissions
RUN mkdir -p /app/uploads/resumes && \
    adduser --disabled-password --gecos "" nodeapp && \
    chown -R nodeapp:nodeapp /app

USER nodeapp

EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:4000/api/v1/health || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/server.js"]
