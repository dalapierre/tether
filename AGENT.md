# Agent Guide

Conventions for working in this repository.

## Project goal

Tether lets you control a coding agent from your phone while the agent runs on a local PC.

The host process owns all execution: spawning agents, running commands, reading repositories, reviewing changes, and creating pull requests. Domain logic lives in `@tether/core`; `@tether/host` exposes it over HTTP/WebSocket and serves `@tether/ui`. The UI is a thin remote control — it sends prompts and presents output; it does not run agent work locally on the phone.

Typical use: the app runs on your computer on the LAN; you open it from your phone elsewhere in the house, pick a repository and coding agent, prompt from the couch, watch progress, review the resulting code, and open PRs — without sitting at the machine.

When making product or architecture decisions, prefer:

- **Host-side execution** — agent runs, tooling, git, and PR workflows happen on the host PC via `@tether/core`.
- **Phone-first remote control** — the UI is for prompting, monitoring, and review on a small screen; desktop browsers get the same flows with wider multi-pane layouts.
- **Local-network access** — connect to the machine running Tether over LAN; keep the control plane usable away from the desk.

## Project file setup

### Packages

| Package        | Role |
| -------------- | ---- |
| `@tether/core` | Domain Host API — sessions, shells/PTYs, settings, repos, agents. No Express/WS/React. |
| `@tether/ui`   | React UI library (screens, stores, design system). No `index.html`. |
| `@tether/host` | Product entry: HTTP/WS adapters over core, owns `index.html`, bundles and serves UI on **one port**. |

Run Tether with `npm run dev` / `npm run start` (both start `@tether/host`). Develop and test the UI through the host — do not run `@tether/ui` as its own Vite app.

Agent sessions use a **shell + harness init command** (no dedicated agent PTY). Auth / `ACCESS_KEY` / login are not used.

### File naming

- **Files** use `camelCase` (e.g. `healthCheck.ts`).
- **Directories** use `dash-separated` (kebab-case) when the name is more than one word (e.g. `chat-module/`, `home-page/`). Single-word directories stay lowercase (e.g. `components/`).

### Path aliases

Use absolute imports via package aliases instead of deep relative paths (`../../../`).

| Alias          | Resolves to             |
| -------------- | ----------------------- |
| `@ui/*`        | `packages/ui/src/*`     |
| `@core/*`      | `packages/core/src/*`   |
| `@host/*`      | `packages/host/src/*`   |
| `@tether/core` | core package exports    |
| `@tether/ui`   | UI library exports      |

Examples:

```ts
import { fetchHealth } from '@ui/libs/api/health';
import { createHost } from '@tether/core';
```

- **UI**: alias is configured in `packages/ui/tsconfig.json` and host’s Vite config.
- **Core / host**: aliases in each package’s `tsconfig.json` (resolved by `tsx` in the host process).

### UI directory layout

Keep `packages/ui/src` organized as follows:

```
packages/ui/src/
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

### Design system (UI)

Treat `components/` as the app's design system. Reusable UI should be defined once there and composed everywhere else — do not redefine the same button, link, container, or other shared control in each module or page.

- **Put shared primitives in `components/`** — buttons, links, containers, inputs, icons wrappers, and similar building blocks with a consistent look.
- **Reuse before reinventing** — when adding UI, check for an existing component first; extend it if it almost fits rather than copying styles into a one-off.
- **Variants via props** — differences like primary vs secondary, disabled, size, or tone belong on the reusable component's props (and styles keyed off those props), not as separate near-duplicate components or inline redefinitions.
- **Feature code composes, not restyles** — `modules/` and `pages/` should assemble design-system pieces; keep feature-specific layout there, shared visual language in `components/`.

### React components (UI)

Every React component in the UI package follows the same structure. Place each component in its own directory (dash-separated when multi-word). Inside that directory:

| File                          | Purpose                                                                                          |
| ----------------------------- | ------------------------------------------------------------------------------------------------ |
| `index.ts`                    | Public exports — the component and any public types                                              |
| `{componentName}.tsx`         | The React component definition                                                                   |
| `{componentName}.styles.ts`   | Tailwind CSS class strings and other stylistic rules (keeps style concerns visible and separate) |
| `{componentName}.types.ts`    | Private and public types for the component. Export public types from `index.ts`                  |
| `{componentName}.messages.ts` | `defineMessages` catalog for all user-facing strings in the component                            |

Example:

```
components/status-badge/
  index.ts
  statusBadge.tsx
  statusBadge.styles.ts
  statusBadge.types.ts
  statusBadge.messages.ts
```

```ts
// statusBadge.types.ts
export type StatusBadgeProps = { label: string };
type InternalState = { hovered: boolean }; // private — not re-exported

// statusBadge.messages.ts
import { defineMessages } from 'react-intl';

export const messages = defineMessages({
    label: {
        id: 'statusBadge.label',
        defaultMessage: 'Ready',
    },
});

// index.ts
export { StatusBadge } from './statusBadge';
export type { StatusBadgeProps } from './statusBadge.types';
```

This applies to components under `components/`, `modules/`, and `pages/` alike.

### Internationalization (UI)

Never hardcode user-facing strings in the UI. All copy — labels, buttons, placeholders, aria-labels, empty states, errors shown in the UI, toast text, and similar — must go through `react-intl`.

- Define strings with `defineMessages` from `react-intl` in `{componentName}.messages.ts` next to the component (or next to the module that owns the copy, e.g. `toast.messages.ts`, `agents.messages.ts`).
- Render with `useIntl().formatMessage(...)` or `<FormattedMessage />`. Do not inline string literals in JSX or props.
- Prefer message `id`s scoped by component/module (e.g. `settings.save`, `toast.dismiss`).
- Dynamic values from the user or API (repository names, server error bodies) may be passed as `values` or shown as-is; the surrounding template and any fallback copy must still be a defined message.
- When a message has ICU placeholders or rich-text tags, declare the values contract and pass `{ typed: true }` (use `MessageTag` for tags, `NoMessageValues` for plain messages in that catalog).

### UI (phone + desktop)

Tether is primarily accessed from a phone, but the UI also supports desktop browsers. Design and implement the UI **mobile-first**, then enhance for larger viewports:

- **Phone (default)** — layouts, spacing, and touch targets for a small screen. Aim for UI friendliness that mimics a native mobile app: full-bleed screens, sticky primary actions, generous tap targets, and clear visual hierarchy. Prefer simple single-column flows that work well with thumbs.
- **Desktop (`md` / 768px and up)** — keep the same flows and visual language, but use the extra space: readable max-widths for lists and forms, and multi-pane layouts where they help (e.g. agent terminal beside code review, file tree beside diff). Settings, new session, and similar full-screen flows are route-level panels that render in place of the session/workspace main content (with matching URLs such as `/settings` and `/new-session`), not overlay modals or centered card dialogs; center their content with a max width so it does not stretch edge-to-edge.
- Do not change phone behavior when adding desktop layouts — desktop enhancements are additive via responsive breakpoints (and `useIsDesktop` when JS must diverge).
- Avoid hover-only affordances as the sole way to complete a task; desktop may add hover polish, but phone must remain fully usable.
- **List item backgrounds must inset** — any selectable, hoverable, or otherwise highlighted element inside a list (rows, menu items, options, etc.) must not let its background touch the left or right edges of its parent. Use horizontal margin (and usually a small radius) so hover/active/selected fills leave a visible gap from the container borders.

### Network calls

API and WebSocket endpoints are unauthenticated. Do not add access-key, bearer-token, or login gates unless explicitly requested.

### Settings schema versioning

The on-disk settings file (`settings.json`) has a top-level `version` field (see `packages/core/src/libs/settings/store.ts`). When making **significant** changes to the settings schema (adding/removing/renaming persisted fields, changing shapes or semantics of existing data), **ask the user whether to bump the schema version** before finishing the work. Do not silently bump it, and do not skip asking just because migration logic does not exist yet.
