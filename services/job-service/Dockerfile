# ==============================
# Base image with pnpm installed
# ==============================
FROM node:20-alpine AS base

WORKDIR /usr/src/app
RUN npm install -g pnpm

# Copy only dependency files first (better caching)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json ./

# Copy source
COPY packages ./packages
COPY services ./services

# ==============================
# Dev stage
# ==============================
FROM base AS dev

# Install *all* dependencies (including devDeps)
RUN pnpm install

# build all packages
RUN pnpm --filter job-service... build

# Default dev command (can be overridden in docker-compose)
CMD [ "pnpm", "--filter", "job-service", "run", "dev" ]

# ==============================
# Builder stage for production
# ==============================
FROM base AS builder

RUN pnpm install
RUN pnpm --filter job-service... build
RUN pnpm prune --prod

# ==============================
# Production image
# ==============================
FROM node:20-alpine AS prod

WORKDIR /usr/src/app
RUN npm install -g pnpm

# Copy minimal files for runtime
COPY --from=builder /usr/src/app/package.json /usr/src/app/pnpm-lock.yaml /usr/src/app/pnpm-workspace.yaml /usr/src/app/tsconfig.json ./
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/packages ./packages
COPY --from=builder /usr/src/app/services ./services

CMD [ "node", "services/job-service/dist/main.js" ]
