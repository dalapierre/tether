import type { EditorTabId } from './editorTabs.types';

type Listener = () => void;

export type EditorTabCloseGuard = {
    /** Persist drafts. Return true on success so the tab can close. */
    save: () => Promise<boolean>;
    /** Revert drafts before closing without saving. */
    discard?: () => void;
};

export type EditorTabDirtySnapshot = {
    dirty: ReadonlySet<EditorTabId>;
    pendingCloseId: EditorTabId | null;
};

const dirtyIds = new Set<EditorTabId>();
const guards = new Map<EditorTabId, EditorTabCloseGuard>();
const listeners = new Set<Listener>();

let pendingCloseId: EditorTabId | null = null;
let snapshot: EditorTabDirtySnapshot = {
    dirty: new Set(),
    pendingCloseId: null,
};

function emit() {
    snapshot = {
        dirty: new Set(dirtyIds),
        pendingCloseId,
    };
    for (const listener of listeners) {
        listener();
    }
}

export function subscribeEditorTabDirty(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

export function getEditorTabDirtySnapshot(): EditorTabDirtySnapshot {
    return snapshot;
}

export function isEditorTabDirty(id: EditorTabId): boolean {
    return dirtyIds.has(id);
}

export function setEditorTabDirty(id: EditorTabId, dirty: boolean): void {
    const wasDirty = dirtyIds.has(id);
    if (dirty === wasDirty) return;
    if (dirty) {
        dirtyIds.add(id);
    } else {
        dirtyIds.delete(id);
    }
    emit();
}

export function clearEditorTabDirty(id: EditorTabId): void {
    const hadPending = pendingCloseId === id;
    const wasDirty = dirtyIds.has(id);
    if (!wasDirty && !hadPending) return;
    dirtyIds.delete(id);
    if (hadPending) {
        pendingCloseId = null;
    }
    emit();
}

export function registerEditorTabCloseGuard(id: EditorTabId, guard: EditorTabCloseGuard): () => void {
    guards.set(id, guard);
    return () => {
        if (guards.get(id) === guard) {
            guards.delete(id);
        }
    };
}

export function getEditorTabCloseGuard(id: EditorTabId): EditorTabCloseGuard | null {
    return guards.get(id) ?? null;
}

export function getPendingEditorTabCloseSnapshot(): EditorTabId | null {
    return snapshot.pendingCloseId;
}

export function requestEditorTabCloseConfirm(id: EditorTabId): void {
    if (pendingCloseId === id) return;
    pendingCloseId = id;
    emit();
}

export function clearPendingEditorTabClose(): void {
    if (pendingCloseId === null) return;
    pendingCloseId = null;
    emit();
}
