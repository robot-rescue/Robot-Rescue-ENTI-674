# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM (not yet used — app uses in-memory state)
- **Validation**: Zod (via `@workspace/api-zod` generated from OpenAPI)
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Artifacts

### Robot Rescue (`artifacts/robot-rescue`)
- **Kind**: react-vite web app
- **Preview path**: `/`
- **Description**: Human-in-the-loop emergency response platform for autonomous robots
- **Pages**: Dashboard (`/`), Incident Detail (`/incidents/:id`), Incident Log (`/log`), Analytics (`/analytics`)
- **Features**: Dark mode, real-time alert simulation (every 15s), severity color coding, framer-motion animations

### API Server (`artifacts/api-server`)
- **Kind**: Express API
- **Preview path**: `/api`
- **State**: In-memory (no database required)
- **Routes**: `/api/incidents`, `/api/incidents/:id`, `/api/incidents/log`, `/api/analytics/summary`

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/robot-rescue run dev` — run frontend locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
