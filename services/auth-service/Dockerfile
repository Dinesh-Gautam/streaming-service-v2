# Stage 1: Builder
FROM node:20-slim AS builder

# Set working directory
WORKDIR /app

# Copy package files and install pnpm
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code and prisma schema
COPY . .

# Build the application
RUN pnpm build

# Install production dependencies
RUN pnpm install --prod --frozen-lockfile

# Stage 2: Production
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy built application, node_modules, and prisma from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 --ingroup nodejs nodejs

# Change ownership of the application files
RUN chown -R nodejs:nodejs /app

# Switch to the non-root user
USER nodejs

# Generate Prisma Client
RUN pnpm prisma generate

# Expose application port
EXPOSE ${PORT}

# Command to start the service
CMD ["node", "dist/presentation/main.js"]