# Tether

Control a coding agent from your phone while it runs on a local PC.

Tether is a LAN control plane: the server on your computer owns all execution (agents, commands, repos, reviews, PRs). The UI on your phone is a remote control that sends prompts and shows output — so you can work from the living room without sitting at the desk.

## Stack

- **Server** (`packages/server`) — Express + TypeScript; command API (to be implemented)
- **Client** (`packages/client`) — React + Tailwind CSS + Vite + TypeScript

In development they run as two processes. Vite proxies `/api` to the server. For phone access on your LAN, both bind to all interfaces (`0.0.0.0` / `host: true`).

## Setup

```bash
npm install
```

## Develop

```bash
npm run dev
```

- UI: `http://localhost:8080` (also on your machine’s LAN IP)
- API: `http://localhost:3001` (health: `/api/health`)

## Build

```bash
npm run build
```
