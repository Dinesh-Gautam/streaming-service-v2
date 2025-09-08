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

# Copy lockfiles first (better cache)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json turbo.json ./

# Pre-fetch dependencies (cached by lockfile)
RUN --mount=type=cache,target=/pnpm/store pnpm fetch

# ==============================
# Dev stage
# ==============================
FROM base AS dev

# Copy source
COPY packages ./packages
COPY services/job-service ./services/job-service

# Install all deps using cached store (skip internet)
RUN --mount=type=cache,target=/pnpm/store pnpm install --frozen-lockfile

RUN pnpm run build --filter=job-service...

# Run turbo dev: job-service and its deps
CMD ["pnpm", "run", "dev", "--filter=job-service..." , "--env-mode=loose"]

# ==============================
# Builder stage (prod build)
# ==============================
FROM base AS builder

# Copy source
COPY packages ./packages
COPY services/job-service ./services/job-service

# Install all deps (locked)
RUN pnpm install --frozen-lockfile

# Build only job-service + deps
RUN pnpm run build --filter=job-service...

# Remove dev deps
RUN pnpm prune --prod

# ==============================
# Production image
# ==============================
FROM node:20-alpine AS prod

WORKDIR /usr/src/app

# Copy the entire pruned application from the builder stage
COPY --from=builder /usr/src/app .

CMD ["node", "services/job-service/dist/main.js"]
