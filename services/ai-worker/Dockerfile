# ==============================
# Base image
# ==============================
FROM ubuntu:24.04 AS base

# Install Node.js 20, ffmpeg, and other dependencies
RUN apt-get update && \
  apt-get install -y --no-install-recommends \
  ca-certificates \
  curl \
  ffmpeg \
  nodejs \
  npm && \
  rm -rf /var/lib/apt/lists/*

# Set up Node.js 20
RUN npm install -g n && n 20

WORKDIR /usr/src/app

# Install global tools
RUN npm install -g pnpm turbo

# Setup pnpm global store (for caching)
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV PNPM_STORE_PATH="/pnpm/store"
ENV FFMPEG_PATH=/usr/bin/ffmpeg

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
COPY services/ai-worker ./services/ai-worker

# Install all deps using cached store (skip internet)
RUN --mount=type=cache,target=/pnpm/store pnpm install --frozen-lockfile

# Build packages
RUN pnpm run build:packages

# Run turbo dev: thumbnail-worker and its deps
CMD ["pnpm", "run", "dev", "--filter=ai-worker" , "--env-mode=loose"]

# ==============================
# Builder stage (prod build)
# ==============================
FROM base AS builder

# Copy source
COPY packages ./packages
COPY services/ai-worker ./services/ai-worker

# Install all deps (locked)
RUN pnpm install --frozen-lockfile

# Build only thumbnail-worker + deps
RUN pnpm run build --filter=ai-worker...

# Remove dev deps
RUN pnpm prune --prod

# ==============================
# Production image
# ==============================
FROM base AS prod

WORKDIR /usr/src/app

# Copy the entire pruned application from the builder stage
COPY --from=builder /usr/src/app .
COPY services/ai-worker/bin ./services/ai-worker/bin

CMD ["node", "services/ai-worker/dist/main.js"]
