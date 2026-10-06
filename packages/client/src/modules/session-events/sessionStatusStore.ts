import type { SessionStatus } from '@client/libs/api/sessions';

export type SessionStatusEntry = {
    name: string;
    status: SessionStatus;
};

type Listener = () => void;

let statuses = new Map<string, SessionStatusEntry>();
/** Sessions that have already reached ready at least once (suppresses startup ready toasts). */
let hasBeenReady = new Set<string>();
const listeners = new Set<Listener>();

function emit() {
    for (const listener of listeners) {
        listener();
    }
}

export function seedSessionStatuses(entries: Iterable<{ id: string; name: string; status: SessionStatus }>): void {
    const next = new Map<string, SessionStatusEntry>();
    const nextReady = new Set<string>();
    for (const entry of entries) {
        next.set(entry.id, { name: entry.name, status: entry.status });
        if (entry.status === 'ready') {
            nextReady.add(entry.id);
        }
    }
    statuses = next;
    hasBeenReady = nextReady;
    emit();
}

export function upsertSessionStatus(input: { sessionId: string; name: string; status: SessionStatus }): void {
    const current = statuses.get(input.sessionId);
    if (current && current.name === input.name && current.status === input.status) return;
    const next = new Map(statuses);
    next.set(input.sessionId, { name: input.name, status: input.status });
    statuses = next;
    if (input.status === 'ready') {
        hasBeenReady.add(input.sessionId);
    }
    emit();
}

export function applySessionStatus(input: {
    sessionId: string;
    name: string;
    status: SessionStatus;
}): SessionStatus | null {
    const previous = statuses.get(input.sessionId)?.status ?? null;
    const next = new Map(statuses);
    next.set(input.sessionId, { name: input.name, status: input.status });
    statuses = next;
    emit();
    return previous;
}

export function markSessionReadySeen(sessionId: string): void {
    hasBeenReady.add(sessionId);
}

export function sessionHasBeenReady(sessionId: string): boolean {
    return hasBeenReady.has(sessionId);
}

export function removeSessionStatus(sessionId: string): void {
    if (!statuses.has(sessionId) && !hasBeenReady.has(sessionId)) return;
    const next = new Map(statuses);
    next.delete(sessionId);
    statuses = next;
    hasBeenReady.delete(sessionId);
    emit();
}

export function getSessionStatus(sessionId: string): SessionStatus | undefined {
    return statuses.get(sessionId)?.status;
}

export function getSnapshot(): ReadonlyMap<string, SessionStatusEntry> {
    return statuses;
}

export function subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}
