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
- **Description**: Mission control SaaS for managing autonomous robot emergencies
- **Theme**: Dark navy (`222 47% 5%`), cyan primary (`185 100% 50%`), Space Grotesk + JetBrains Mono
- **Pages**:
  - `/` Dashboard — incident grid/list with filter tabs, severity badges, hover glow effects
  - `/incidents/:id` Incident Detail — camera feed, telemetry, AI suggestions, operator assignment, tactical commands
  - `/assignments` Assignments — operator task management table (assign incidents to Alex Chen, Sarah Kim, Jordan Patel, Darren Watkins Jr.)
  - `/log` Incident Log — search/filter historical incidents
  - `/analytics` Analytics — 6 KPIs, line chart, location chart, AI insights
- **Features**:
  - Real-time alert simulation every 15s (IDs prefixed `SIM-`)
  - Severity card borders: left 3px accent + hover glow (red=high, amber=medium, blue=low)
  - System status header bar (ONLINE/ACTIVE/CRITICAL counts)
  - Notification bell with per-incident dropdown
  - Response window countdown timer (30min for HIGH severity incidents)
  - AI suggested actions (rule-based, per issue type)
  - SVG animated camera feed with warehouse perspective, robot silhouette, HUD overlays
  - `useSimulatedAlerts` context: exports `simulatedIncidents`, `notifications`, `unreadCount`, `markAllRead`, `markOneRead`, `removeSimulatedIncident`, `addNotification`
  - `usePersistedState` in dashboard for localStorage filter persistence

### API Server (`artifacts/api-server`)
- **Kind**: Express API
- **Preview path**: `/api`
- **State**: In-memory (no database required)
- **Routes**: `/api/incidents`, `/api/incidents/:id`, `/api/incidents/log`, `/api/analytics/summary`
- **Extended schema**: `assignedTo`, `locationBreakdown`, `incidentsPerDay`, `highSeverityPct`

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/robot-rescue run dev` — run frontend locally

## Operators
Alex Chen (AC/cyan), Sarah Kim (SK/violet), Jordan Patel (JP/amber), Darren Watkins Jr. (DW/emerald)

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
