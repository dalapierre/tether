import { getLocalStorageJson, setLocalStorageJson } from '@ui/libs/storage/localStorage';
import type { EditorTab, EditorTabId, SessionEditorTab, TerminalEditorTab } from './editorTabs.types';

const STORAGE_KEY = 'tether.editorTabs';

/** Single workspace terminal editor tab (splits live inside the panel, not as more tabs). */
export const WORKSPACE_TERMINAL_ID = 'workspace';

export function terminalTabId(terminalId: string): TerminalEditorTab['id'] {
    return `terminal:${terminalId}`;
}

type Listener = () => void;

function isEditorTab(value: unknown): value is EditorTab {
    if (!value || typeof value !== 'object') return false;
    const tab = value as {
        kind?: unknown;
        id?: unknown;
        sessionId?: unknown;
        terminalId?: unknown;
        title?: unknown;
    };
    if (tab.kind === 'settings' && tab.id === 'settings') return true;
    if (tab.kind === 'new-session' && tab.id === 'new-session') return true;
    if (
        tab.kind === 'session' &&
        typeof tab.sessionId === 'string' &&
        tab.sessionId.length > 0 &&
        tab.id === `session:${tab.sessionId}` &&
        (tab.title === undefined || typeof tab.title === 'string')
    ) {
        return true;
    }
    if (
        tab.kind === 'terminal' &&
        typeof tab.terminalId === 'string' &&
        tab.terminalId.length > 0 &&
        tab.id === `terminal:${tab.terminalId}` &&
        (tab.title === undefined || typeof tab.title === 'string')
    ) {
        return true;
    }
    return false;
}

function loadTabs(): EditorTab[] {
    const stored = getLocalStorageJson<unknown>(STORAGE_KEY);
    if (!Array.isArray(stored)) return [];
    const next: EditorTab[] = [];
    const seen = new Set<EditorTabId>();
    let workspaceTerminal: TerminalEditorTab | null = null;
    for (const entry of stored) {
        if (!isEditorTab(entry) || seen.has(entry.id)) continue;
        seen.add(entry.id);
        if (entry.kind === 'session') {
            next.push({
                id: entry.id,
                kind: 'session',
                sessionId: entry.sessionId,
                ...(entry.title ? { title: entry.title } : {}),
            });
        } else if (entry.kind === 'terminal') {
            // Collapse legacy one-shell-per-tab terminals into the shared workspace panel tab.
            if (!workspaceTerminal) {
                workspaceTerminal = {
                    id: terminalTabId(WORKSPACE_TERMINAL_ID),
                    kind: 'terminal',
                    terminalId: WORKSPACE_TERMINAL_ID,
                    ...(entry.title ? { title: entry.title } : {}),
                };
            } else if (entry.title && !workspaceTerminal.title) {
                workspaceTerminal = {
                    id: workspaceTerminal.id,
                    kind: 'terminal',
                    terminalId: WORKSPACE_TERMINAL_ID,
                    title: entry.title,
                };
            }
        } else {
            next.push(entry);
        }
    }
    if (workspaceTerminal) {
        next.push(workspaceTerminal);
    }
    return next;
}

function persistTabs(next: EditorTab[]): void {
    setLocalStorageJson(STORAGE_KEY, next);
}

let tabs: EditorTab[] = loadTabs();
// Persist any legacy terminal-tab collapse performed in loadTabs.
persistTabs(tabs);
const listeners = new Set<Listener>();

function emit() {
    persistTabs(tabs);
    for (const listener of listeners) {
        listener();
    }
}

export function subscribeEditorTabs(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

export function getEditorTabsSnapshot(): EditorTab[] {
    return tabs;
}

export function sessionTabId(sessionId: string): SessionEditorTab['id'] {
    return `session:${sessionId}`;
}

export function createSessionTab(sessionId: string, title?: string): SessionEditorTab {
    return {
        id: sessionTabId(sessionId),
        kind: 'session',
        sessionId,
        ...(title ? { title } : {}),
    };
}

export function createTerminalTab(terminalId: string, title?: string): TerminalEditorTab {
    return {
        id: terminalTabId(terminalId),
        kind: 'terminal',
        terminalId,
        ...(title ? { title } : {}),
    };
}

export function createWorkspaceTerminalTab(title?: string): TerminalEditorTab {
    return createTerminalTab(WORKSPACE_TERMINAL_ID, title);
}

export const SETTINGS_TAB: EditorTab = { id: 'settings', kind: 'settings' };
export const NEW_SESSION_TAB: EditorTab = { id: 'new-session', kind: 'new-session' };

export function pathForEditorTab(tab: EditorTab): string {
    switch (tab.kind) {
        case 'session':
            return `/sessions/${tab.sessionId}`;
        case 'settings':
            return '/settings';
        case 'new-session':
            return '/new-session';
        case 'terminal':
            return `/terminals/${tab.terminalId}`;
    }
}

/** Parse a location pathname into an editor tab, or null for non-tab routes (e.g. `/`). */
export function editorTabFromPath(pathname: string): EditorTab | null {
    if (pathname === '/settings') return SETTINGS_TAB;
    if (pathname === '/new-session') return NEW_SESSION_TAB;
    const sessionMatch = /^\/sessions\/([^/]+)$/.exec(pathname);
    if (sessionMatch?.[1]) return createSessionTab(sessionMatch[1]);
    const terminalMatch = /^\/terminals\/([^/]+)$/.exec(pathname);
    if (terminalMatch?.[1]) return createWorkspaceTerminalTab();
    return null;
}

export function openEditorTab(tab: EditorTab): void {
    const index = tabs.findIndex((existing) => existing.id === tab.id);
    if (index !== -1) {
        const existing = tabs[index];
        if (tab.kind === 'session' && existing?.kind === 'session' && tab.title && existing.title !== tab.title) {
            const next = [...tabs];
            next[index] = { ...existing, title: tab.title };
            tabs = next;
            emit();
            return;
        }
        if (tab.kind === 'terminal' && existing?.kind === 'terminal' && tab.title && existing.title !== tab.title) {
            const next = [...tabs];
            next[index] = { ...existing, title: tab.title };
            tabs = next;
            emit();
            return;
        }
        return;
    }
    tabs = [...tabs, tab];
    emit();
}

/** Update a terminal tab's displayed title (e.g. from OSC). */
export function setTerminalTabTitle(terminalId: string, title: string): void {
    const id = terminalTabId(terminalId);
    const index = tabs.findIndex((tab) => tab.id === id);
    if (index === -1) return;
    const existing = tabs[index];
    if (!existing || existing.kind !== 'terminal' || existing.title === title) return;
    const next = [...tabs];
    next[index] = { ...existing, title };
    tabs = next;
    emit();
}

/** Ensure the tab for the current route exists (deep links, refresh, first navigation). */
export function ensureEditorTabForPath(pathname: string): void {
    const tab = editorTabFromPath(pathname);
    if (tab) openEditorTab(tab);
}

export function closeEditorTab(id: EditorTabId): EditorTab | null {
    const index = tabs.findIndex((tab) => tab.id === id);
    if (index === -1) return null;

    const nextTabs = tabs.filter((tab) => tab.id !== id);
    const fallback = nextTabs[index - 1] ?? nextTabs[index] ?? null;
    tabs = nextTabs;
    emit();
    return fallback;
}

export function closeSessionEditorTab(sessionId: string): EditorTab | null {
    return closeEditorTab(sessionTabId(sessionId));
}

/** Drop session tabs whose sessions no longer exist (e.g. deleted from the list). */
export function pruneMissingSessionTabs(existingSessionIds: Iterable<string>): void {
    const ids = new Set(existingSessionIds);
    const next = tabs.filter((tab) => tab.kind !== 'session' || ids.has(tab.sessionId));
    if (next.length === tabs.length) return;
    tabs = next;
    emit();
}

/** Keep persisted session tab titles in sync with the live sessions map. */
export function syncSessionTabTitles(sessionNames: ReadonlyMap<string, string>): void {
    let changed = false;
    const next = tabs.map((tab) => {
        if (tab.kind !== 'session') return tab;
        const name = sessionNames.get(tab.sessionId);
        if (!name || name === tab.title) return tab;
        changed = true;
        return { ...tab, title: name };
    });
    if (!changed) return;
    tabs = next;
    emit();
}

/** Replace tab order (e.g. after drag-reorder). Persists via emit. */
export function setEditorTabsOrder(next: EditorTab[]): void {
    if (next.length !== tabs.length) return;
    const currentIds = new Set(tabs.map((tab) => tab.id));
    if (next.some((tab) => !currentIds.has(tab.id))) return;
    if (next.every((tab, index) => tab.id === tabs[index]?.id)) return;
    tabs = next;
    emit();
}

/** Move `draggedId` so it sits at the index currently occupied by `targetId`. */
export function moveEditorTab(draggedId: EditorTabId, targetId: EditorTabId): void {
    if (draggedId === targetId) return;
    const from = tabs.findIndex((tab) => tab.id === draggedId);
    const to = tabs.findIndex((tab) => tab.id === targetId);
    if (from === -1 || to === -1) return;
    const next = [...tabs];
    const [item] = next.splice(from, 1);
    if (!item) return;
    next.splice(to, 0, item);
    tabs = next;
    emit();
}
