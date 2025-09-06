# ==============================
# Base image
# ==============================
FROM node:20-alpine AS base

WORKDIR /usr/src/app

# Install global tools
RUN npm install -g pnpm turbo

# Setup pnpm global store (for caching)
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV PNPM_STORE_PATH="/pnpm/store"
ENV PRISMA_GENERATE_SKIP_ENGINE_DOWNLOAD=true

# Copy lockfiles first (better cache)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json turbo.json ./

# Pre-fetch dependencies (cached by lockfile)
RUN --mount=type=cache,target=/pnpm/store \
  pnpm fetch

# ==============================
# Dev stage
# ==============================
FROM base AS dev

# Copy source
COPY packages ./packages
COPY services/auth-service ./services/auth-service

# Install all deps using cached store (skip internet)
RUN pnpm install --frozen-lockfile

# RUN pnpm run --filter=job-service prisma:generate

# Run turbo dev: auth-service and its deps
CMD ["pnpm", "run", "dev", "--filter=auth-service..." , "--env-mode=loose"]

# ==============================
# Builder stage (prod build)
# ==============================
FROM base AS builder

# Copy source
COPY packages ./packages
COPY services/auth-service ./services/auth-service

# Install all deps (locked)
RUN pnpm install --frozen-lockfile

RUN pnpm run --filter=auth-service prisma:generate

# Build only auth-service + deps
RUN pnpm run build --filter=auth-service...

# Remove dev deps
RUN pnpm prune --prod

# ==============================
# Production image
# ==============================
FROM node:20-alpine AS prod

WORKDIR /usr/src/app

# Copy the entire pruned application from the builder stage
COPY --from=builder /usr/src/app .

CMD ["node", "services/auth-service/dist/main.js"]
