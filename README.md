# Tether

AI control plane over local network.

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
