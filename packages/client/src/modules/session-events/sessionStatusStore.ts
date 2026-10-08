import { isAgentId, type AgentId } from '@client/libs/agents/agents';
import type { Session, SessionStatus } from '@client/libs/api/sessions';

const FALLBACK_AGENT: AgentId = 'cursor';

function resolveAgent(value: string | undefined, fallback?: AgentId): AgentId {
    if (value && isAgentId(value)) return value;
    return fallback ?? FALLBACK_AGENT;
}

/** @deprecated Prefer Session from the sessions map; kept for status-only consumers. */
export type SessionStatusEntry = {
    name: string;
    status: SessionStatus;
    branch?: string | null;
    behindDefault?: number | null;
    defaultBranch?: string | null;
};

type Listener = () => void;

let sessions = new Map<string, Session>();
/** True after the events socket has delivered at least one snapshot. */
let snapshotReceived = false;
/** Sessions that have already reached ready at least once (suppresses startup ready toasts). */
let hasBeenReady = new Set<string>();
/** Bumped when the server signals that review diffs may have changed. */
let diffGenerations = new Map<string, number>();
const listeners = new Set<Listener>();

function emit() {
    for (const listener of listeners) {
        listener();
    }
}

function toStatusEntry(session: Session): SessionStatusEntry {
    return {
        name: session.name,
        status: session.status,
        branch: session.branch,
        behindDefault: session.behindDefault,
        defaultBranch: session.defaultBranch,
    };
}

export function seedSessions(items: Session[]): void {
    const next = new Map<string, Session>();
    const nextReady = new Set<string>();
    for (const session of items) {
        next.set(session.id, session);
        if (session.status === 'ready') {
            nextReady.add(session.id);
        }
    }
    sessions = next;
    hasBeenReady = nextReady;
    snapshotReceived = true;
    emit();
}

/** @deprecated Use seedSessions */
export function seedSessionStatuses(
    entries: Iterable<{
        id: string;
        name: string;
        status: SessionStatus;
        branch?: string | null;
        behindDefault?: number | null;
        defaultBranch?: string | null;
        profileId?: string;
        agent?: Session['agent'];
        type?: Session['type'];
        repositoryId?: string | null;
        createdAt?: number;
    }>,
): void {
    const items: Session[] = [];
    for (const entry of entries) {
        const existing = sessions.get(entry.id);
        items.push({
            id: entry.id,
            name: entry.name,
            profileId: entry.profileId ?? existing?.profileId ?? '',
            agent: resolveAgent(entry.agent, existing?.agent),
            type: entry.type ?? existing?.type ?? 'coding',
            repositoryId: entry.repositoryId ?? existing?.repositoryId ?? null,
            branch: entry.branch ?? existing?.branch ?? null,
            behindDefault: entry.behindDefault ?? existing?.behindDefault ?? null,
            defaultBranch: entry.defaultBranch ?? existing?.defaultBranch ?? null,
            status: entry.status,
            createdAt: entry.createdAt ?? existing?.createdAt ?? 0,
        });
    }
    seedSessions(items);
}

export function upsertSession(session: Session): void {
    const current = sessions.get(session.id);
    if (
        current &&
        current.name === session.name &&
        current.profileId === session.profileId &&
        current.agent === session.agent &&
        current.type === session.type &&
        current.repositoryId === session.repositoryId &&
        current.branch === session.branch &&
        current.behindDefault === session.behindDefault &&
        current.defaultBranch === session.defaultBranch &&
        current.status === session.status &&
        current.createdAt === session.createdAt
    ) {
        return;
    }
    const next = new Map(sessions);
    next.set(session.id, session);
    sessions = next;
    if (session.status === 'ready') {
        hasBeenReady.add(session.id);
    }
    emit();
}

export function upsertSessionStatus(input: { sessionId: string; name: string; status: SessionStatus }): void {
    const current = sessions.get(input.sessionId);
    if (!current) return;
    if (current.name === input.name && current.status === input.status) return;
    const next = new Map(sessions);
    next.set(input.sessionId, {
        ...current,
        name: input.name,
        status: input.status,
    });
    sessions = next;
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
    const current = sessions.get(input.sessionId);
    if (!current) return null;
    const previous = current.status;
    if (current.name === input.name && current.status === input.status) {
        return previous;
    }
    const next = new Map(sessions);
    next.set(input.sessionId, {
        ...current,
        name: input.name,
        status: input.status,
    });
    sessions = next;
    emit();
    return previous;
}

export function applySessionBranch(input: {
    sessionId: string;
    branch: string | null;
    behindDefault: number | null;
    defaultBranch: string | null;
}): void {
    const current = sessions.get(input.sessionId);
    if (!current) return;
    if (
        current.branch === input.branch &&
        current.behindDefault === input.behindDefault &&
        current.defaultBranch === input.defaultBranch
    ) {
        return;
    }
    const next = new Map(sessions);
    next.set(input.sessionId, {
        ...current,
        branch: input.branch,
        behindDefault: input.behindDefault,
        defaultBranch: input.defaultBranch,
    });
    sessions = next;
    emit();
}

export function bumpDiffGeneration(sessionId: string): void {
    const next = new Map(diffGenerations);
    next.set(sessionId, (next.get(sessionId) ?? 0) + 1);
    diffGenerations = next;
    emit();
}

export function getDiffGeneration(sessionId: string): number {
    return diffGenerations.get(sessionId) ?? 0;
}

export function markSessionReadySeen(sessionId: string): void {
    hasBeenReady.add(sessionId);
}

export function sessionHasBeenReady(sessionId: string): boolean {
    return hasBeenReady.has(sessionId);
}

export function removeSession(sessionId: string): void {
    if (!sessions.has(sessionId) && !hasBeenReady.has(sessionId) && !diffGenerations.has(sessionId)) {
        return;
    }
    const next = new Map(sessions);
    next.delete(sessionId);
    sessions = next;
    hasBeenReady.delete(sessionId);
    if (diffGenerations.has(sessionId)) {
        const nextDiff = new Map(diffGenerations);
        nextDiff.delete(sessionId);
        diffGenerations = nextDiff;
    }
    emit();
}

/** @deprecated Use removeSession */
export function removeSessionStatus(sessionId: string): void {
    removeSession(sessionId);
}

export function getSessionStatus(sessionId: string): SessionStatus | undefined {
    return sessions.get(sessionId)?.status;
}

export function getLiveSession(sessionId: string): Session | undefined {
    return sessions.get(sessionId);
}

export function hasSessionsSnapshot(): boolean {
    return snapshotReceived;
}

export function getSessionsSnapshot(): ReadonlyMap<string, Session> {
    return sessions;
}

/** Status-oriented view of the live session map (for existing list/view merges). */
export function getSnapshot(): ReadonlyMap<string, SessionStatusEntry> {
    const entries = new Map<string, SessionStatusEntry>();
    for (const [id, session] of sessions) {
        entries.set(id, toStatusEntry(session));
    }
    return entries;
}

export function subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}
