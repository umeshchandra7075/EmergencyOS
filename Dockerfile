FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install --frozen-lockfile

# Copy source code
COPY src ./src
COPY seed ./seed

# Build application
RUN npm run build 2>/dev/null || true

# =========================================================
# Production Stage
# =========================================================
FROM node:20-alpine AS production

WORKDIR /app

# Copy package.json and install only production dependencies
COPY package.json ./
RUN npm install --production --frozen-lockfile

# Copy built source from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src ./src
COPY --from=builder /app/seed ./seed
COPY .env.example ./

# Set working directory and expose port
EXPOSE 4000

# Environment variables
ENV NODE_ENV=production
ENV PORT=4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/health || exit 1

# Start server
CMD ["node", "src/app.js"]