# Architecture Refactor Plan

How Tether becomes a clean three-package layout: reusable `@tether/core` and `@tether/ui`, wired into a thin server shell `@tether/host` that exposes core over an HTTP/WebSocket API and serves the frontend.

Decisions below are locked from product discussion. Electron / desktop packaging is out of scope — the product entry point for this work is `@tether/host`.

## Goal

Today Tether is a browser UI (`packages/client`) + HTTP/WebSocket server (`packages/server`). Domain logic and transport are tangled: Express routes, WS, and session/PTY code live together; the UI talks only over `fetch` / WebSocket and owns its own `index.html` / Vite app entry.

This transition:

1. **Extract** server-side domain logic into `@tether/core` — Host API only. No REST, no WebSockets, no Express.
2. **Extract** `packages/client` into `@tether/ui` — the same React UI as a library: screens, stores, design system. **No `index.html`.** No assumption that the package is a standalone Vite app.
3. **Add** `@tether/host` — server shell under `packages/host`:
   - Imports `@tether/core` and wraps it in REST + WebSocket adapters.
   - Owns `index.html` and the frontend bundling entry; imports `@tether/ui` and serves the built UI.
4. **Retire** the tangled `packages/server` + standalone `packages/client` app as the product entry point. `@tether/host` is how you run Tether.

Product intent stays the same: work runs on the host PC; the UI is the control plane. Core and UI stay free of transport and HTML-shell concerns so other hosts (or alternate adapters) can reuse them later without a rewrite.

## Locked decisions (in scope)

| Topic | Decision |
| --- | --- |
| Primary entry | `@tether/host` — first (and only) product entry point for this work. |
| Packages | `@tether/core`, `@tether/ui`, `@tether/host` |
| Core | Domain logic + shared types only. Does not implement REST or WS endpoints. |
| UI | Today’s `client/` → `@tether/ui`. Library package (no `index.html`). Consumed by host’s bundler entry. |
| Host | Thin shell: HTTP/WS adapters over core, static/UI serving, process bootstrap. No business logic duplicated from core. |
| Host port | **One port** for UI and backend. API, WebSockets, and `index.html`/assets share the same HTTP server listen address. No separate Vite/dev port for the product path. |
| Host transport | REST + WebSocket between browser and host (same origin). Host calls the Host API; UI talks only through its transport façade. |
| Auth (for now) | None. Remove login screen and `ACCESS_KEY`. Treat everything as unauthenticated. |
| Agent sessions | No dedicated agent PTY. Shell + harness init command. See [Agent execution model](#agent-execution-model). |
| Process hosting | Core (shells / PTYs) in the host Node process for v1. |
| Dependencies | Fewest packages possible. Prefer the existing stack (React, Vite, Express/ws or equivalent, node-pty, TypeScript). |
| Electron / desktop shell | Out of scope. Do not implement in this plan. |

## Current architecture (baseline)

| Piece | Today |
| --- | --- |
| Packages | `packages/client`, `packages/server` |
| UI | React + Vite; owns `index.html`; relative `/api/*` fetch; WS on `window.location.host` |
| Server | Express + WS + domain libs (sessions, settings, repos, agents, …) in one package |
| State | `~/.tether/*`; in-memory session map + node-pty |
| Auth | `ACCESS_KEY` + login (to be removed) |

What moves where:

| Today | After extract |
| --- | --- |
| `packages/server/src/libs/**` (sessions, settings, repos, agents, paths, process, hubs, …) | `@tether/core` |
| `packages/server` routes, middleware, `index.ts`, `terminalServer` (HTTP/WS bootstrap) | Replaced by `@tether/host` adapters + entry (do not keep the old tangled server as the long-term shape) |
| `packages/client/**` (screens, stores, API clients, assets) | `@tether/ui` |
| `packages/client/index.html` + Vite app shell | **`@tether/host`** — host owns HTML entry and bundles UI into it |
| (new) | `@tether/host` — API + static/UI server |

## Target package layout

```
packages/
  core/   # @tether/core  — domain Host API + shared types (no HTTP, no WS, no React)
  ui/     # @tether/ui    — React UI library (from packages/client); no index.html, no Node APIs
  host/   # @tether/host  — server entry: wrap core as API, own index.html, bundle + serve UI
```

```
  ┌─────────────────────────────────────┐
  │           @tether/host              │
  │  HTTP/WS API  +  serves index.html  │
  └─────┬──────────────────┬────────────┘
        │ imports          │ imports / bundles
        ▼                  ▼
  ┌───────────┐      ┌───────────┐
  │@tether/core│      │@tether/ui │
  └───────────┘      └───────────┘
```

## Responsibility split

| Package | Owns | Must not own |
| --- | --- | --- |
| **core** | Session lifecycle, shells/PTYs, harness command resolution, diffs, settings/repos/agents, paths, event fan-out (transport-agnostic), shared types, `createHost()` / Host API | Express, `ws` server wiring, React, HTML entry |
| **ui** | Screens, stores, design system, API façade over a transport (HTTP/WS when served by host) | `index.html`, Vite app bootstrap, node-pty, `~/.tether` I/O, agent CLIs, Express |
| **host** | Process entry, REST/WS adapters calling core, `index.html`, frontend bundling that imports `@tether/ui`, static asset serving, logging bootstrap | Duplicate session/git/shell logic; React feature screens |

## Minimal dependencies

Prefer the existing stack (React, Vite, node-pty, Express/`ws` or equivalent) over new frameworks.

Host: TypeScript + whatever is already used for HTTP/WS + Vite (or the repo’s chosen bundler) for the UI shell — no heavy boilerplate kits.

Shared types live in `@tether/core` so ui/host don’t redefine them.

## How the pieces connect

### `@tether/core`

Plain Host API: async methods + subscribe/push for session events and shell I/O.

No knowledge of route paths, WebSocket frames, or HTML.

Host is the only in-scope caller of `createHost()`.

```ts
// Conceptual
const host = await createHost(); // restore sessions, etc.
// host.listSessions(), host.createSession(...), host.openAgentShell(...), ...
```

### `@tether/host`

```ts
// host entry (conceptual)
import { createHost } from '@tether/core';

const host = await createHost();
registerHttpRoutes(app, host);   // REST → Host API
registerWebSockets(server, host); // WS → Host API event / shell streams
serveUi(app);                    // index.html + bundled @tether/ui
```

- Imports `@tether/core`.
- Registers HTTP routes and WebSocket handlers that call the Host API.
- Owns `index.html` and the bundler entry that imports `@tether/ui` and mounts the app.
- Serves the built frontend (dev: Vite middleware or equivalent **mounted on the same server**; prod: static build on that server).
- **Single listen port:** UI and API are not split across two ports. The browser loads the app and calls `/api/*` (and WS) on `window.location.host` with no proxy to a second origin required.

### `@tether/ui`

Same app as today’s client: routes, session list, agent/terminal/review panes, settings — exported as a library (e.g. root `App` / mount helper), **not** as a standalone HTML app.

- **No `index.html` in `@tether/ui`.** The package is not runnable by itself as a site.
- Replace hard-coded assumptions with a small transport used by `libs/api/*`.
- When loaded by host, that transport is HTTP + WebSocket against the **same origin** as the page (relative `/api/*` and `window.location.host` for WS) — because host serves UI and backend on one port.

```ts
// Conceptual — UI side
interface TetherTransport {
  request<T>(method: string, params?: unknown): Promise<T>;
  subscribe(channel: string, handler: (msg: unknown) => void): () => void;
  openStream(channel: string): TetherStream;
}
```

Feature modules must not import Node fs/pty APIs. Host wires the concrete transport (or the UI boots a default HTTP/WS transport when served by host).

### How UI is tested / developed

`@tether/ui` is validated by being **imported into `@tether/host`**, which:

1. Owns `index.html`.
2. Bundles the UI code into that shell.
3. Serves it alongside the API **on the same port**.

There is no separate “open the UI package’s own Vite root” product path, and no second listen port for the API. Dev and prod both go through one host process on one port.

## Future reuse

Not inventing alternate hosts in this transition.

The package split is intentional so that later we can:

- Reuse `@tether/core` from another Node process or adapter without dragging Express route files, and
- Reuse `@tether/ui` in another shell by swapping HTML entry + transport wiring,

without rewriting the UI screens or the domain logic.

Until then: design `@tether/ui` so it does not hard-depend on host internals (no Express imports; no `index.html`), and `@tether/core` so it does not hard-depend on Express/`ws` server wiring. That is enough future-proofing for this plan.

## Host toolchain

Package: `@tether/host`

| Concern | Choice |
| --- | --- |
| Language | TypeScript |
| UI bundler / dev | Vite (or current stack), entry owned by host; in dev, middleware on the host server (not a separate Vite port) |
| Server | Existing HTTP + WebSocket stack (thin adapters over core) |
| Listen | One port — UI assets + REST + WS |
| UI entry | Host-owned `index.html` that bundles `@tether/ui` |
| Platform code | Detect OS where needed (PATH, shells, pty, paths) |

Dev: one host process listens once; API + UI bundler/dev middleware share that server; UI HMR via host’s frontend pipeline.  
Prod: same process and port serve built UI assets and the API.

Keep host thin: bootstrap, adapters, HTML/static serving. Domain stays in core.

## Agent execution model

Today each coding session has two PTY processes:

1. **Agent PTY** — `pty.spawn(harness.file, harness.args)` (`spawnHarness`)
2. **User shell PTY** — Terminal pane (`spawnUserShell`)

**Target:** drop the dedicated agent PTY. Agent view = a shell (same idea as the terminal pane): spawn the user shell in the session cwd, then write the harness init command into that shell.

Implications for core:

- Harness resolution still builds the command (resume/yolo/trust prep); it does **not** spawn the agent binary as its own PTY.
- Prompt / resize / output attach to the agent shell.
- Validate status parsing (`agentStatus`) and resume with shell-wrapped agents.
- node-pty remains for shells; only the special-case agent process spawn goes away.

Land this during the core extract so host never depends on the old dual-PTY agent model.

## Phased transition

Focus: extract → host wraps core + serves UI. No Electron phases.

### Phase 0 — Packages + types

- Add `@tether/core` skeleton (exports + shared types).
- Move/rename `packages/client` → `packages/ui` (`@tether/ui`).
- Strip `index.html` and standalone app-shell ownership from UI; leave a library entry (App / mount).
- Remove or stub auth so the UI can boot without login once host serves it.
- **Exit:** workspace resolves `@tether/core` and `@tether/ui`.

### Phase 1 — Host shell

- Add `@tether/host` (`packages/host`): process entry, host-owned `index.html`, bundler config that imports `@tether/ui`.
- Serve the UI from host on the **same port** as API stubs (dev + prod paths).
- Optional: one or two health/settings API stubs before the full core move.
- **Exit:** running host opens/serves the UI in a browser on one port, with no separate client package entry and no second API port.

### Phase 2 — Extract domain into `@tether/core`

- Move sessions, settings, repositories, agents, paths, process, logger, hubs from server libs into core.
- Hubs are transport-agnostic (subscriber `send` / `close`), not tied to `ws.WebSocket`.
- `createHost()` owns restore + lifecycle.
- Shell-based agents (see above).
- Host imports core; old Express-tangled server is no longer the domain home.
- **Exit:** Host API lives in core; no REST/WS inside core.

### Phase 3 — Host adapters + UI transport

- Implement host HTTP/WS adapters that call the Host API.
- Point `@tether/ui` `libs/api/*` at the transport façade (HTTP/WS when served by host).
- Cover sessions, shells/terminals, events, settings, repos, agents.
- Remove login / `ACCESS_KEY` from UI (and leftover server auth if still present).
- Delete dependence on the old `packages/server` + standalone client app for local runs.
- **Exit:** full app works via `@tether/host` alone (core + ui); one process serves API + UI.

### Phase 4 — Cleanup + docs

- Remove or archive obsolete `packages/server` / `packages/client` entry paths once host is the sole runner.
- README / `AGENT.md`: host entry, package layout, no `ACCESS_KEY`, shell-based agents, UI has no `index.html`.
- Note that UI is developed/tested through host’s HTML + bundler entry.

## Migration mechanics

### Aliases

| Alias | Resolves |
| --- | --- |
| `@tether/core` | core package exports |
| `@tether/ui` / `@ui/*` | UI src — replace `@client/*` |
| host-local | package-local for host server + HTML/bundler entry |

Rules:

- UI must not import Node `fs`/pty APIs or host server modules.
- UI must not ship or require its own `index.html`.
- Core must not import Express or `ws` server wiring.
- Host imports core; host bundles/serves ui.

### Dev vs prod

| Scenario | UI load | Talks to core via | Port |
| --- | --- | --- | --- |
| Host dev | Host Vite middleware (or equiv.) → imports `@tether/ui` | Same-origin HTTP/WS → Host API | One listen port |
| Host prod | Host serves built assets from its `index.html` shell | Same-origin HTTP/WS → Host API | One listen port |

## Risks and constraints

| Risk | Mitigation |
| --- | --- |
| UI still assumes standalone Vite app | Move `index.html` + app bootstrap to host early; UI exports library entry only |
| Shell-wrapped agents break status/resume | Per-harness smoke tests; adjust status/resume injection |
| UI still assumes old server shapes mid-migration | Introduce transport early; finish host adapters before deleting old server entry |
| Large `sessions/store.ts` | Move into core first; fold shell-based agent spawn in same phase |
| Host PATH missing agent CLIs | Inherit / augment PATH in host process per OS |
| Accidentally putting domain logic in host routes | Host handlers stay thin: parse → `host.*` → serialize |
| Dev accidentally splits Vite port vs API port | Mount UI middleware on the host HTTP server; do not run a standalone Vite listen as the product path |
| Dependency creep | Reuse existing HTTP/WS + Vite stack; don’t add frameworks for the shell |

## What changes vs what stays

### Stays

- Session / worktree / `~/.tether` model
- Agent harness command resolution (how agents are invoked)
- Phone-first layouts in the UI (still useful when served by host)
- Host-side execution (`AGENT.md`)

### Changes (this transition)

- Entry point → `@tether/host`
- Domain → `@tether/core` (no REST/WS)
- `packages/client` → `@tether/ui` **library** (no `index.html`)
- HTML + bundling entry → owned by `@tether/host`
- UI + API on **one host port** (same origin)
- Transport adapters (REST/WS) → owned by `@tether/host`, calling core
- Agent sessions → shell + harness init command
- Auth / login / `ACCESS_KEY` → removed for now

### Deferred

- Electron / desktop shell
- Alternate non-host UI shells
- Any “bridge” that re-embeds domain logic outside core

## End-state UX (this transition)

1. User starts Tether via `@tether/host` (one process, one port).
2. Host serves the UI (`index.html` + bundled `@tether/ui`) and the API/WS on that same port.
3. Session list opens immediately — no login.
4. All features (sessions, agent shell, terminal, review, settings) work against core through host adapters (same-origin requests).
5. `@tether/ui` is never run as its own HTML app; host is the only way to load it.

## Immediate next step

1. Scaffold `@tether/core` and `@tether/host`; move/rename client → `@tether/ui` (library, no `index.html`).
2. Host owns `index.html` and imports/bundles `@tether/ui`.
3. Move domain libs into core; wire host HTTP/WS adapters; delete dependence on the old server/client split for local runs.
