# Agent Guide

Conventions for working in this repository.

## Project file setup

### File naming

- **Files** use `snake_case` (e.g. `health_check.ts`).
- **Directories** use `dash-separated` (kebab-case) when the name is more than one word (e.g. `chat-module/`, `home-page/`). Single-word directories stay lowercase (e.g. `components/`).

### Path aliases

Use absolute imports via package aliases instead of deep relative paths (`../../../`).

| Alias | Resolves to |
| --- | --- |
| `@client/*` | `packages/client/src/*` |
| `@server/*` | `packages/server/src/*` |

Examples:

```ts
import { fetchHealth } from '@client/libs/api/health';
import { someUtil } from '@server/utils/some_util';
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

Routing uses `react-router-dom`. Register routes in `modules/app/` and put each screen under `pages/`.

### React components (client)

Every React component in the client follows the same structure. Place each component in its own directory (dash-separated when multi-word). Inside that directory:

| File | Purpose |
| --- | --- |
| `index.ts` | Public exports — the component and any public types |
| `{component_name}.tsx` | The React component definition |
| `{component_name}.styles.ts` | Tailwind CSS class strings and other stylistic rules (keeps style concerns visible and separate) |
| `{component_name}.types.ts` | Private and public types for the component. Export public types from `index.ts` |

Example:

```
components/status-badge/
  index.ts
  status_badge.tsx
  status_badge.styles.ts
  status_badge.types.ts
```

```ts
// status_badge.types.ts
export type StatusBadgeProps = { label: string };
type InternalState = { hovered: boolean }; // private — not re-exported

// index.ts
export { StatusBadge } from './status_badge';
export type { StatusBadgeProps } from './status_badge.types';
```

This applies to components under `components/`, `modules/`, and `pages/` alike.
