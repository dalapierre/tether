import {
    connectSessionEvents,
    listSessions,
    parseServerSessionEventMessage,
    type SessionStatus,
} from '@client/libs/api/sessions';
import { showToast } from '@client/modules/toast';
import {
    applySessionBranch,
    applySessionStatus,
    applySessionUsage,
    bumpDiffGeneration,
    hasSessionsSnapshot,
    markSessionReadySeen,
    removeSession,
    seedSessions,
    sessionHasBeenReady,
    upsertSession,
} from './sessionStatusStore';

const RECONNECT_DELAY_MS = 2000;

let started = false;
let socket: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let intentionalClose = false;

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
        const parsed = parseServerSessionEventMessage(String(event.data));
        if (!parsed) return;

        if (parsed.type === 'snapshot') {
            seedSessions(parsed.sessions);
            return;
        }

        if (parsed.type === 'upsert') {
            upsertSession(parsed.session);
            return;
        }

        if (parsed.type === 'remove') {
            removeSession(parsed.sessionId);
            return;
        }

        if (parsed.type === 'status') {
            const previous = applySessionStatus({
                sessionId: parsed.sessionId,
                name: parsed.name,
                status: parsed.status,
            });
            maybeToastStatusChange(parsed.sessionId, previous, parsed.status, parsed.name);
            return;
        }

        if (parsed.type === 'branch') {
            applySessionBranch({
                sessionId: parsed.sessionId,
                branch: parsed.branch,
                behindDefault: parsed.behindDefault,
                defaultBranch: parsed.defaultBranch,
            });
            return;
        }

        if (parsed.type === 'usage') {
            applySessionUsage({
                sessionId: parsed.sessionId,
                cpuPercent: parsed.cpuPercent,
                ramPercent: parsed.ramPercent,
            });
            return;
        }

        bumpDiffGeneration(parsed.sessionId);
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
 * REST list is only a bootstrap fallback if the first WS snapshot is delayed.
 */
export function ensureSessionEventsStarted(): void {
    if (started) return;
    started = true;
    intentionalClose = false;
    connect();
    void listSessions()
        .then((sessions) => {
            if (!hasSessionsSnapshot()) {
                seedSessions(sessions);
            }
        })
        .catch(() => {
            // Live snapshot / reconnect still hydrates the list when available.
        });
}
