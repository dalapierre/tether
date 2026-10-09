import type { SessionStatus } from '@server/libs/sessions/types.js';
import type { WebSocket } from 'ws';

const MAX_BUFFER_CHARS = 200_000;

export type ServerTerminalMessage =
    { type: 'history'; data: string } | { type: 'output'; data: string } | { type: 'status'; status: SessionStatus };

export type ServerShellMessage = { type: 'history'; data: string } | { type: 'output'; data: string };

export type ClientTerminalMessage =
    | { type: 'message'; text: string }
    | { type: 'input'; data: string }
    | { type: 'resize'; cols: number; rows: number };

type SessionTerminalState = {
    buffer: string;
    clients: Set<WebSocket>;
};

const terminals = new Map<string, SessionTerminalState>();
const shells = new Map<string, SessionTerminalState>();

function getOrCreate(map: Map<string, SessionTerminalState>, sessionId: string): SessionTerminalState {
    let state = map.get(sessionId);
    if (!state) {
        state = { buffer: '', clients: new Set() };
        map.set(sessionId, state);
    }
    return state;
}

function send(socket: WebSocket, message: ServerTerminalMessage | ServerShellMessage): void {
    if (socket.readyState === socket.OPEN) {
        socket.send(JSON.stringify(message));
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

export function appendShellOutput(sessionId: string, data: string): void {
    const state = getOrCreate(shells, sessionId);
    state.buffer = (state.buffer + data).slice(-MAX_BUFFER_CHARS);
    const message: ServerShellMessage = { type: 'output', data };
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

export function attachTerminalClient(sessionId: string, socket: WebSocket, status: SessionStatus): void {
    const state = getOrCreate(terminals, sessionId);
    state.clients.add(socket);
    send(socket, { type: 'history', data: state.buffer });
    send(socket, { type: 'status', status });

    socket.on('close', () => {
        state.clients.delete(socket);
    });
}

export function attachShellClient(sessionId: string, socket: WebSocket): void {
    const state = getOrCreate(shells, sessionId);
    state.clients.add(socket);
    send(socket, { type: 'history', data: state.buffer });

    socket.on('close', () => {
        state.clients.delete(socket);
    });
}

/** Drop shell scrollback and disconnect shell clients. */
export function clearShell(sessionId: string): void {
    const state = shells.get(sessionId);
    if (state) {
        for (const client of [...state.clients]) {
            try {
                client.close();
            } catch {
                // ignore
            }
        }
    }
    shells.delete(sessionId);
}

export function clearTerminal(sessionId: string): void {
    terminals.delete(sessionId);
    clearShell(sessionId);
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
