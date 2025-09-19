# ==============================
# Base image
# ==============================
FROM node:20-alpine AS base

RUN apk add --no-cache ffmpeg

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
COPY services/subtitle-worker ./services/subtitle-worker

# Install all deps using cached store (skip internet)
RUN --mount=type=cache,target=/pnpm/store pnpm install --frozen-lockfile

# Build packages
RUN pnpm run build:packages

# Run turbo dev: thumbnail-worker and its deps
CMD ["pnpm", "run", "dev", "--filter=subtitle-worker..." , "--env-mode=loose"]

# ==============================
# Builder stage (prod build)
# ==============================
FROM base AS builder

# Copy source
COPY packages ./packages
COPY services/subtitle-worker ./services/subtitle-worker

# Install all deps (locked)
RUN pnpm install --frozen-lockfile

# Build only thumbnail-worker + deps
RUN pnpm run build --filter=subtitle-worker...

# Remove dev deps
RUN pnpm prune --prod

# ==============================
# Production image
# ==============================
FROM node:20-alpine AS prod

WORKDIR /usr/src/app

# Copy the entire pruned application from the builder stage
COPY --from=builder /usr/src/app .

CMD ["node", "services/subtitle-worker/dist/main.js"]
