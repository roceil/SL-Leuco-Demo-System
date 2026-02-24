# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # Start dev server with hot-reload
pnpm build        # Type-check + build for production
pnpm type-check   # Run vue-tsc type checking only
pnpm lint         # ESLint with auto-fix
pnpm test:unit    # Run unit tests with Vitest
pnpm preview      # Preview production build locally
```

## Architecture Overview

This is a **ferry booking & management SPA** (藍白航運 / SL-Leuco) for ferry operators and agents. The app currently uses a file-based JSON database (`db.json`) served by a custom Vite plugin — no real backend exists yet.

### Tech Stack

- **Vue 3** (Composition API only) + **Vite 7**
- **Pinia 3** for global state, **Composables** for shared domain logic
- **Tailwind CSS 4** for styling
- **TypeScript 5.9** throughout
- **db.json** as the mock database, accessed via `/api/:collection` routes handled by the `simpleDb` Vite plugin in `vite.config.ts`

### State & Data Flow

**Initialization order matters** (`src/main.ts`):
1. Pinia stores init in parallel: `useRouteStore`, `useTicketStore`, `useRbacStore`, `useOrderStore`
2. Ships load first (composable dependency)
3. Then composables init in parallel: `initSchedules()`, `initWhitelist()`, `initOrders()`
4. App mounts only after all data is loaded

**Two state layers:**
- **Pinia stores** (`src/stores/`): Global business entities — tickets, orders, RBAC, routes, auth
- **Composables** (`src/composables/`): Domain operations with module-level `ref()` singletons — schedules, ships, whitelist, passengers, payments, audit log

**Data persistence:** All reads/writes go through `useLocalStorage.ts` → `apiGet()`/`apiPut()` → Vite plugin → `db.json`. Writes are fire-and-forget (async, non-blocking).

### Key Directories

- `src/views/` — 27+ page components, one per route
- `src/stores/` — Pinia stores for globally shared state
- `src/composables/` — Reusable logic; composables with module-level reactive state act as singletons
- `src/types/` — TypeScript types; type files also contain utility functions (e.g., `validateIssueTicket()`, `calculatePaymentAmounts()`)
- `src/components/ui/` — Shared UI component library
- `src/router/index.ts` — 28 routes

### Domain Concepts

- **Schedules**: Regular (daily) or flexible (one-off) ferry departures
- **Tickets**: Have face prices with segment-based discounts; special whitelist tickets for residents/groups
- **Orders**: Track both deposit and final balance payments; can have invoices (2-line, 3-line, e-invoice)
- **Passengers**: Board with identity verification; residency tracked for special ticket eligibility
- **RBAC**: Roles, permissions, and accounts managed in `src/stores/rbac.ts`
- **Audit Log**: Every data mutation should be logged via `useAuditLog()` composable
- **Auth security**: Max 5 login failures → 30-minute lockout (managed in `useAuth.ts`)

### Path Alias

`@/` maps to `src/` (configured in both `vite.config.ts` and `tsconfig.app.json`).

## Important Notes
- 回答時統一使用繁體中文。