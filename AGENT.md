# Agent Guide

Conventions for working in this repository.

## Project file setup

### Path aliases

Use absolute imports via package aliases instead of deep relative paths (`../../../`).

| Alias | Resolves to |
| --- | --- |
| `@client/*` | `packages/client/src/*` |
| `@server/*` | `packages/server/src/*` |

Examples:

```ts
import { fetchHealth } from '@client/libs/api/health';
import { someUtil } from '@server/utils/someUtil';
```

- **Client**: alias is configured in `packages/client/vite.config.ts` and `packages/client/tsconfig.json`.
- **Server**: alias is configured in `packages/server/tsconfig.json` (resolved by `tsx` in dev; rewritten by `tsc-alias` on build).

### Client directory layout

Keep `packages/client/src` organized as follows:

```
packages/client/src/
  components/   # reusable UI pieces with little or no domain logic
  modules/      # feature integrations (e.g. chat) — not meant to be reused elsewhere
  libs/         # business logic, API calls, shared types, utils
  pages/        # route-level wrappers; structure only, compose modules + components
```

Rules:

- **`components/`** — Presentational, reusable building blocks. Prefer props in / events out. No feature-specific orchestration.
- **`modules/`** — Complex, feature-scoped integrations that own their own state and logic. Not treated as generic reusable UI.
- **`libs/`** — Shared non-UI code: API clients, domain helpers, types, utilities.
- **`pages/`** — Thin route wrappers. A page wires modules and components together and provides layout/structure only; keep business logic in `libs/` or `modules/`.

Routing uses `react-router-dom`. Register routes in `App.tsx` and put each screen under `pages/`.
