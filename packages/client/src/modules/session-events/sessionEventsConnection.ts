import {
    connectSessionEvents,
    listSessions,
    type ServerSessionEventMessage,
    type SessionStatus,
} from '@client/libs/api/sessions';
import { showToast } from '@client/modules/toast';
import {
    applySessionBranch,
    applySessionStatus,
    markSessionReadySeen,
    seedSessionStatuses,
    sessionHasBeenReady,
} from './sessionStatusStore';

const RECONNECT_DELAY_MS = 2000;

let started = false;
let socket: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let intentionalClose = false;

function parseEventMessage(raw: string): ServerSessionEventMessage | null {
    try {
        const parsed = JSON.parse(raw) as ServerSessionEventMessage;
        if (!parsed || typeof parsed !== 'object') {
            return null;
        }
        if (parsed.type === 'status') {
            if (typeof parsed.sessionId !== 'string' || typeof parsed.name !== 'string') {
                return null;
            }
            if (parsed.status !== 'ready' && parsed.status !== 'busy' && parsed.status !== 'error') {
                return null;
            }
            return parsed;
        }
        if (parsed.type === 'branch') {
            if (typeof parsed.sessionId !== 'string') {
                return null;
            }
            if (parsed.branch !== null && typeof parsed.branch !== 'string') {
                return null;
            }
            if (parsed.behindDefault !== null && typeof parsed.behindDefault !== 'number') {
                return null;
            }
            if (parsed.defaultBranch !== null && typeof parsed.defaultBranch !== 'string') {
                return null;
            }
            return parsed;
        }
        return null;
    } catch {
        return null;
    }
}

function maybeToastStatusChange(
    sessionId: string,
    previous: SessionStatus | null,
    next: SessionStatus,
    name: string,
): void {
    if (previous === 'busy' && next === 'ready') {
        // Skip the first ready after create/startup; toast only when the agent finishes a later turn.
        if (sessionHasBeenReady(sessionId)) {
            showToast('session-ready', name);
        }
        markSessionReadySeen(sessionId);
        return;
    }
    if (next === 'ready') {
        markSessionReadySeen(sessionId);
    }
    if (previous !== null && previous !== 'error' && next === 'error') {
        showToast('session-error', name);
    }
}

function scheduleReconnect() {
    if (intentionalClose || reconnectTimer !== null) return;
    reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connect();
    }, RECONNECT_DELAY_MS);
}

async function seed() {
    try {
        const sessions = await listSessions();
        seedSessionStatuses(sessions);
    } catch {
        // Status toasts still work from live events if the seed fails.
    }
}

function connect() {
    if (intentionalClose) return;
    if (socket && (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN)) {
        return;
    }

    let nextSocket: WebSocket;
    try {
        nextSocket = connectSessionEvents();
    } catch {
        scheduleReconnect();
        return;
    }

    socket = nextSocket;

    nextSocket.addEventListener('message', (event) => {
        const parsed = parseEventMessage(String(event.data));
        if (!parsed) return;

        if (parsed.type === 'status') {
            const previous = applySessionStatus({
                sessionId: parsed.sessionId,
                name: parsed.name,
                status: parsed.status,
            });
            maybeToastStatusChange(parsed.sessionId, previous, parsed.status, parsed.name);
            return;
        }

        applySessionBranch({
            sessionId: parsed.sessionId,
            branch: parsed.branch,
            behindDefault: parsed.behindDefault,
            defaultBranch: parsed.defaultBranch,
        });
    });

    nextSocket.addEventListener('close', () => {
        if (socket === nextSocket) {
            socket = null;
        }
        if (!intentionalClose) {
            scheduleReconnect();
        }
    });
}

/**
 * Start the app-wide session events socket once per page load.
 * Survives React Strict Mode remounts so Vite's WS proxy is not churned.
 */
export function ensureSessionEventsStarted(): void {
    if (started) return;
    started = true;
    intentionalClose = false;
    void seed().then(() => {
        if (!intentionalClose) {
            connect();
        }
    });
}
