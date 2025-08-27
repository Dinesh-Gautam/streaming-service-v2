# Monorepo Setup Plan

This document outlines the plan for setting up a monorepo to manage the new microservices and the existing Next.js frontend.

## 1. Monorepo Tooling

We will use **pnpm** workspaces to manage the monorepo. pnpm is a fast and disk-space-efficient package manager that has excellent support for monorepos.

## 2. Directory Structure

The new monorepo will have the following structure:

```
/
├── apps/
│   ├── frontend/      # The existing Next.js application
│   └── ...            # Other future applications
├── packages/
│   ├── user-service/
│   ├── movie-service/
│   ├── media-service/
│   ├── search-service/
│   └── ...            # Shared packages (e.g., UI components, configs)
├── package.json
└── pnpm-workspace.yaml
```

## 3. Migration Steps

1.  **Initialize a new pnpm workspace:** Create a new `pnpm-workspace.yaml` file in the root of the project.
2.  **Move the existing application:** Move the current Next.js application into the `apps/frontend` directory.
3.  **Create service packages:** Create new directories for each microservice under the `packages/` directory.
4.  **Update dependencies:** Adjust the `package.json` files to manage dependencies within the monorepo.

---
