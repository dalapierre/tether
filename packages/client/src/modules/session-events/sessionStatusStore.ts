import type { SessionStatus } from '@client/libs/api/sessions';

export type SessionStatusEntry = {
    name: string;
    status: SessionStatus;
};

type Listener = () => void;

let statuses = new Map<string, SessionStatusEntry>();
const listeners = new Set<Listener>();

function emit() {
    for (const listener of listeners) {
        listener();
    }
}

export function seedSessionStatuses(entries: Iterable<{ id: string; name: string; status: SessionStatus }>): void {
    const next = new Map<string, SessionStatusEntry>();
    for (const entry of entries) {
        next.set(entry.id, { name: entry.name, status: entry.status });
    }
    statuses = next;
    emit();
}

export function upsertSessionStatus(input: { sessionId: string; name: string; status: SessionStatus }): void {
    const current = statuses.get(input.sessionId);
    if (current && current.name === input.name && current.status === input.status) return;
    const next = new Map(statuses);
    next.set(input.sessionId, { name: input.name, status: input.status });
    statuses = next;
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

export function removeSessionStatus(sessionId: string): void {
    if (!statuses.has(sessionId)) return;
    const next = new Map(statuses);
    next.delete(sessionId);
    statuses = next;
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
