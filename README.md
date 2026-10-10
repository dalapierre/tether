# Tether

An agentic session workspace — self-hosted, always free.

Tether is a place to run and manage coding-agent sessions on your own machine. Prompt an agent, watch it work, review the changes it makes, and jump between tasks without losing context. Sessions, terminals, and diffs live together instead of being scattered across chats, terminals, and tabs.

Work runs on your PC. Open Tether from your phone or desktop browser on the local network — the UI is a remote control, not a second place work happens. No SaaS, no subscription, no lock-in.

## Run

```bash
npm install
npm run start
```

This builds the project and runs it in production mode.

## Why Tether

Coding agents are powerful, but the workflow around them is fragmented: one chat here, a terminal there, a diff somewhere else, and no good way to leave a task mid-flight and come back later. Tether treats each piece of agent work as a **session** you can start, leave, resume, and clean up — so context switching is the product, not an afterthought.

## Sessions

A session is a durable agent workspace you can return to at any time.

- **Coding sessions** — tied to a repository (and optionally a branch). The agent works in that project; you can review the resulting changes as they land.
- **Conversation sessions** — chat-style agent work without a repository, when you don’t need a codebase attached.
- **Live status** — each session shows whether it’s ready, busy, or in error, including updates while you’re looking at something else.
- **Search and switch** — find sessions by name, repository, or branch, open one, leave it, start another, come back. Deleting a session cleans up the agent process and any worktree or branch Tether created for it.

## Agents and profiles

Tether drives the coding agents you already have installed on the host. Supported harnesses include **Cursor**, **Claude Code**, **Codex**, **OpenCode**, and **Rovo** — whichever are available on your machine show up as options.

**Profiles** capture how you like to start work: coding vs conversation, which agent to use, whether to auto-approve agent commands (Yolo mode), and whether to isolate the session in a git worktree. Set a default profile once, then spin up new sessions without re-deciding every time.

## In a session

Each session is a focused workspace with three views:

- **Agent** — the live agent terminal. Send prompts from your phone or keyboard and watch progress as it happens.
- **Terminal** — a separate interactive shell in the same workspace when you need to run commands yourself.
- **Review** — for coding sessions, browse the file tree of changes and open side-by-side diffs (including markdown preview). See what’s added, modified, deleted, or renamed without leaving the session.

On a phone, these are tabs you flip between. On desktop, you can keep the agent in view and open review and terminal as side and bottom panels.

Sessions persist on the host and can resume after a restart, so walking away from the desk — or rebooting — doesn’t throw away the thread.

## Repositories and isolation

Point Tether at a development directory, then add the git repositories you care about. Coding sessions pick from that list.

When a profile uses worktrees, a session gets its own checkout on a branch you choose or create — so parallel agent work doesn’t stomp on your main working tree. Without worktrees, the session runs in the repository checkout itself. Review always shows what that session changed relative to where it started.

## Built for context switching

Tether is designed so you can:

1. Start a session for a task (repo, branch, agent).
2. Prompt and monitor from wherever you are on the LAN.
3. Leave mid-flight — status updates and toasts follow you on the session list.
4. Start another session for a different context.
5. Come back, continue, review, and delete when you’re done.

Phone-first layouts keep prompting and review usable away from the desk; desktop adds multi-pane layouts and customizable keyboard shortcuts for the same flows.

## Self-hosted and free

Tether runs on your machine. Your agents, repos, and session data stay local — no cloud account required. It will always be free: no hosted tier, no subscription, no vendor lock-in.
