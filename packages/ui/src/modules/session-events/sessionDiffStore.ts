import { getSessionDiff, type SessionDiffSummary } from '@ui/libs/api/sessions';

export type SessionDiffState = {
    summary: SessionDiffSummary | null;
    pending: boolean;
    generation: number;
    error: string | null;
};

type InternalEntry = SessionDiffState & {
    abort: AbortController | null;
    promise: Promise<SessionDiffState> | null;
};

const entries = new Map<string, InternalEntry>();
const listeners = new Set<() => void>();

function emit(): void {
    for (const listener of listeners) {
        listener();
    }
}

function getOrCreate(sessionId: string): InternalEntry {
    let entry = entries.get(sessionId);
    if (!entry) {
        entry = {
            summary: null,
            pending: false,
            generation: -1,
            error: null,
            abort: null,
            promise: null,
        };
        entries.set(sessionId, entry);
    }
    return entry;
}

export function subscribeSessionDiff(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

export function getSessionDiffState(sessionId: string): SessionDiffState {
    const entry = entries.get(sessionId);
    if (!entry) {
        return { summary: null, pending: false, generation: -1, error: null };
    }
    return {
        summary: entry.summary,
        pending: entry.pending,
        generation: entry.generation,
        error: entry.error,
    };
}

/**
 * Deduped fetch for a session diff generation. Concurrent callers share one request.
 * A newer generation aborts the previous in-flight request.
 */
export function ensureSessionDiff(sessionId: string, generation: number): Promise<SessionDiffState> {
    const entry = getOrCreate(sessionId);

    if (entry.generation === generation && entry.promise) {
        return entry.promise;
    }

    if (entry.generation === generation && entry.summary && !entry.pending && !entry.promise) {
        return Promise.resolve({
            summary: entry.summary,
            pending: entry.pending,
            generation: entry.generation,
            error: entry.error,
        });
    }

    entry.abort?.abort();
    const abort = new AbortController();
    entry.abort = abort;
    entry.generation = generation;
    entry.pending = true;
    entry.error = null;
    emit();

    const promise = getSessionDiff(sessionId, { signal: abort.signal })
        .then((result) => {
            if (entry.abort !== abort) {
                return {
                    summary: entry.summary,
                    pending: entry.pending,
                    generation: entry.generation,
                    error: entry.error,
                };
            }
            // Don't clobber a known file list with a cold empty/pending placeholder,
            // but do accept an empty list once the server says the refresh finished
            // (pending=false) so commits/stashes can clear the hierarchy.
            if (result.pending && result.diff.files.length === 0 && entry.summary && entry.summary.files.length > 0) {
                entry.pending = true;
            } else {
                entry.summary = result.diff;
                entry.pending = result.pending;
            }
            entry.error = null;
            entry.promise = null;
            if (entry.abort === abort) {
                entry.abort = null;
            }
            emit();
            return {
                summary: entry.summary,
                pending: entry.pending,
                generation: entry.generation,
                error: entry.error,
            };
        })
        .catch((err: unknown) => {
            if (entry.abort !== abort) {
                return {
                    summary: entry.summary,
                    pending: entry.pending,
                    generation: entry.generation,
                    error: entry.error,
                };
            }
            entry.promise = null;
            if (entry.abort === abort) {
                entry.abort = null;
            }
            if (abort.signal.aborted) {
                return {
                    summary: entry.summary,
                    pending: entry.pending,
                    generation: entry.generation,
                    error: entry.error,
                };
            }
            entry.pending = false;
            entry.error = err instanceof Error ? err.message : 'Failed to load diff';
            emit();
            return {
                summary: entry.summary,
                pending: entry.pending,
                generation: entry.generation,
                error: entry.error,
            };
        });

    entry.promise = promise;
    return promise;
}

export function clearSessionDiff(sessionId: string): void {
    const entry = entries.get(sessionId);
    if (!entry) return;
    entry.abort?.abort();
    entries.delete(sessionId);
    emit();
}
