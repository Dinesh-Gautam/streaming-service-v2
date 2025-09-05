# Stage 1: Build the application
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Install pnpm
RUN npm install -g pnpm

# Copy dependency definitions
COPY package.json pnpm-lock.yaml ./
# pnpm-workspace.yaml is crucial for monorepo setup
COPY pnpm-workspace.yaml ./
COPY tsconfig.json ./

# Copy source code for all packages and services
COPY packages/ ./packages/
COPY services/ ./services/

# Install all dependencies to create symlinks and have devDeps available
RUN pnpm install

# Build all dependencies and the target service
# The '...' prefix tells pnpm to also build all dependencies of the target
RUN pnpm --filter thumbnail-worker... build

# Prune dev dependencies for a smaller node_modules
RUN pnpm prune --prod

# Stage 2: Create the production image
FROM node:20-alpine

WORKDIR /usr/src/app

# Copy the pruned node_modules and the built source code from the builder stage
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/packages ./packages
COPY --from=builder /usr/src/app/services/thumbnail-worker ./services/thumbnail-worker

# Command to run the application
CMD [ "node", "services/thumbnail-worker/dist/main.js" ]
