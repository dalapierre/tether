# Agent Guide

Conventions for working in this repository.

## Project goal

Tether lets you control a coding agent from your phone while the agent runs on a local PC.

The server owns all execution: spawning agents, running commands, reading repositories, reviewing changes, and creating pull requests. The UI is a thin remote control — it sends prompts and presents output; it does not run agent work locally on the phone.

Typical use: the app runs on your computer on the LAN; you open it from your phone elsewhere in the house, pick a repository and coding agent, prompt from the couch, watch progress, review the resulting code, and open PRs — without sitting at the machine.

When making product or architecture decisions, prefer:

- **Server-side execution** — agent runs, tooling, git, and PR workflows happen on the host PC.
- **Phone-first remote control** — the client is for prompting, monitoring, and review on a small screen.
- **Local-network access** — connect to the machine running Tether over LAN; keep the control plane usable away from the desk.

## Project file setup

### File naming

- **Files** use `camelCase` (e.g. `healthCheck.ts`).
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

Routing uses `react-router-dom`. Register routes in `modules/app/` and put each screen under `pages/`.

### Design system (client)

Treat `components/` as the app's design system. Reusable UI should be defined once there and composed everywhere else — do not redefine the same button, link, container, or other shared control in each module or page.

- **Put shared primitives in `components/`** — buttons, links, containers, inputs, icons wrappers, and similar building blocks with a consistent look.
- **Reuse before reinventing** — when adding UI, check for an existing component first; extend it if it almost fits rather than copying styles into a one-off.
- **Variants via props** — differences like primary vs secondary, disabled, size, or tone belong on the reusable component's props (and styles keyed off those props), not as separate near-duplicate components or inline redefinitions.
- **Feature code composes, not restyles** — `modules/` and `pages/` should assemble design-system pieces; keep feature-specific layout there, shared visual language in `components/`.

### React components (client)

Every React component in the client follows the same structure. Place each component in its own directory (dash-separated when multi-word). Inside that directory:

| File | Purpose |
| --- | --- |
| `index.ts` | Public exports — the component and any public types |
| `{componentName}.tsx` | The React component definition |
| `{componentName}.styles.ts` | Tailwind CSS class strings and other stylistic rules (keeps style concerns visible and separate) |
| `{componentName}.types.ts` | Private and public types for the component. Export public types from `index.ts` |

Example:

```
components/status-badge/
  index.ts
  statusBadge.tsx
  statusBadge.styles.ts
  statusBadge.types.ts
```

```ts
// statusBadge.types.ts
export type StatusBadgeProps = { label: string };
type InternalState = { hovered: boolean }; // private — not re-exported

// index.ts
export { StatusBadge } from './statusBadge';
export type { StatusBadgeProps } from './statusBadge.types';
```

This applies to components under `components/`, `modules/`, and `pages/` alike.

### UI (mobile-first)

Tether is primarily accessed from a phone. Design and implement the UI **mobile-first**, and aim for **UI friendliness that mimics a native mobile app**:

- Default layouts, spacing, and touch targets for a small screen; enhance for larger viewports only when needed.
- Prefer simple, single-column flows that work well with thumbs.
- Favor mobile-app patterns: full-bleed screens, bottom navigation or sticky primary actions, generous tap targets, and clear visual hierarchy over dense web chrome (sidebars, multi-panel dashboards, hover-only menus).
- Avoid dense desktop-oriented patterns (multi-column dashboards, hover-only affordances) unless they degrade gracefully on mobile.
