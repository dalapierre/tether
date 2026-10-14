type Listener = () => void;

let pendingSplits = 0;
const listeners = new Set<Listener>();

function emit() {
    for (const listener of listeners) {
        listener();
    }
}

/** Ask the open workspace terminal panel to append another shell split. */
export function requestWorkspaceShellSplit(): void {
    pendingSplits += 1;
    emit();
}

/** Drain queued split requests (e.g. from the sessions-panel + menu). */
export function consumeWorkspaceShellSplitRequests(): number {
    const count = pendingSplits;
    pendingSplits = 0;
    return count;
}

export function subscribeWorkspaceShellSplitRequests(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}
