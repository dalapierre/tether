import type { HubClient } from '@core/libs/hubClient.js';
import type { SessionStatus } from '@core/libs/sessions/types.js';

const MAX_BUFFER_CHARS = 200_000;

export type ServerTerminalMessage =
    { type: 'history'; data: string } | { type: 'output'; data: string } | { type: 'status'; status: SessionStatus };

export type ServerShellMessage =
    { type: 'history'; data: string } | { type: 'output'; data: string } | { type: 'title'; title: string };

export type ClientTerminalMessage =
    | { type: 'message'; text: string }
    | { type: 'input'; data: string }
    | { type: 'resize'; cols: number; rows: number };

type SessionTerminalState = {
    buffer: string;
    clients: Set<HubClient>;
    title: string;
};

const terminals = new Map<string, SessionTerminalState>();
/** sessionId → shellId → state */
const shells = new Map<string, Map<string, SessionTerminalState>>();

function getOrCreate(map: Map<string, SessionTerminalState>, sessionId: string): SessionTerminalState {
    let state = map.get(sessionId);
    if (!state) {
        state = { buffer: '', clients: new Set(), title: '' };
        map.set(sessionId, state);
    }
    return state;
}

function getOrCreateShell(sessionId: string, shellId: string): SessionTerminalState {
    let byShell = shells.get(sessionId);
    if (!byShell) {
        byShell = new Map();
        shells.set(sessionId, byShell);
    }
    let state = byShell.get(shellId);
    if (!state) {
        state = { buffer: '', clients: new Set(), title: '' };
        byShell.set(shellId, state);
    }
    return state;
}

function send(socket: HubClient, message: ServerTerminalMessage | ServerShellMessage): void {
    if (socket.readyState === socket.OPEN) {
        socket.send(JSON.stringify(message));
    }
}

function closeClients(clients: Set<HubClient>): void {
    for (const client of [...clients]) {
        try {
            client.close();
        } catch {
            // ignore
        }
    }
}

export function appendOutput(sessionId: string, data: string): void {
    const state = getOrCreate(terminals, sessionId);
    state.buffer = (state.buffer + data).slice(-MAX_BUFFER_CHARS);
    const message: ServerTerminalMessage = { type: 'output', data };
    for (const client of state.clients) {
        send(client, message);
    }
}

export function appendShellOutput(sessionId: string, shellId: string, data: string): void {
    const state = getOrCreateShell(sessionId, shellId);
    state.buffer = (state.buffer + data).slice(-MAX_BUFFER_CHARS);
    const message: ServerShellMessage = { type: 'output', data };
    for (const client of state.clients) {
        send(client, message);
    }
}

export function setShellTitle(sessionId: string, shellId: string, title: string): void {
    const state = getOrCreateShell(sessionId, shellId);
    if (state.title === title) return;
    state.title = title;
    const message: ServerShellMessage = { type: 'title', title };
    for (const client of state.clients) {
        send(client, message);
    }
}

export function broadcastStatus(sessionId: string, status: SessionStatus): void {
    const state = terminals.get(sessionId);
    if (!state) return;
    const message: ServerTerminalMessage = { type: 'status', status };
    for (const client of state.clients) {
        send(client, message);
    }
}

export function attachTerminalClient(sessionId: string, socket: HubClient, status: SessionStatus): void {
    const state = getOrCreate(terminals, sessionId);
    state.clients.add(socket);
    send(socket, { type: 'history', data: state.buffer });
    send(socket, { type: 'status', status });

    socket.on('close', () => {
        state.clients.delete(socket);
    });
}

export function attachShellClient(sessionId: string, shellId: string, socket: HubClient): void {
    const state = getOrCreateShell(sessionId, shellId);
    state.clients.add(socket);
    send(socket, { type: 'history', data: state.buffer });
    if (state.title) {
        send(socket, { type: 'title', title: state.title });
    }

    socket.on('close', () => {
        state.clients.delete(socket);
    });
}

/** Drop one shell's scrollback and disconnect its clients. */
export function clearShell(sessionId: string, shellId: string): void {
    const byShell = shells.get(sessionId);
    if (!byShell) return;
    const state = byShell.get(shellId);
    if (state) {
        closeClients(state.clients);
        byShell.delete(shellId);
    }
    if (byShell.size === 0) {
        shells.delete(sessionId);
    }
}

/** Drop all shells for a session. */
export function clearAllShells(sessionId: string): void {
    const byShell = shells.get(sessionId);
    if (!byShell) return;
    for (const state of byShell.values()) {
        closeClients(state.clients);
    }
    shells.delete(sessionId);
}

export function clearTerminal(sessionId: string): void {
    terminals.delete(sessionId);
    clearAllShells(sessionId);
}

export function parseClientMessage(raw: string): ClientTerminalMessage | null {
    try {
        const parsed = JSON.parse(raw) as ClientTerminalMessage;
        if (!parsed || typeof parsed !== 'object' || !('type' in parsed)) {
            return null;
        }
        if (parsed.type === 'message' && typeof parsed.text === 'string') {
            return parsed;
        }
        if (parsed.type === 'input' && typeof parsed.data === 'string') {
            return parsed;
        }
        if (
            parsed.type === 'resize' &&
            typeof parsed.cols === 'number' &&
            typeof parsed.rows === 'number' &&
            Number.isFinite(parsed.cols) &&
            Number.isFinite(parsed.rows)
        ) {
            return parsed;
        }
        return null;
    } catch {
        return null;
    }
}
