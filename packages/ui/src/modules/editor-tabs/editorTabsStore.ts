import { getLocalStorageJson, setLocalStorageJson } from '@ui/libs/storage/localStorage';
import type { EditorTab, EditorTabId, SessionEditorTab } from './editorTabs.types';

const STORAGE_KEY = 'tether.editorTabs';

type Listener = () => void;

function isEditorTab(value: unknown): value is EditorTab {
    if (!value || typeof value !== 'object') return false;
    const tab = value as { kind?: unknown; id?: unknown; sessionId?: unknown };
    if (tab.kind === 'settings' && tab.id === 'settings') return true;
    if (tab.kind === 'new-session' && tab.id === 'new-session') return true;
    if (
        tab.kind === 'session' &&
        typeof tab.sessionId === 'string' &&
        tab.sessionId.length > 0 &&
        tab.id === `session:${tab.sessionId}`
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
    for (const entry of stored) {
        if (!isEditorTab(entry) || seen.has(entry.id)) continue;
        seen.add(entry.id);
        next.push(entry);
    }
    return next;
}

function persistTabs(next: EditorTab[]): void {
    setLocalStorageJson(STORAGE_KEY, next);
}

let tabs: EditorTab[] = loadTabs();
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

export function createSessionTab(sessionId: string): SessionEditorTab {
    return { id: sessionTabId(sessionId), kind: 'session', sessionId };
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
    }
}

/** Parse a location pathname into an editor tab, or null for non-tab routes (e.g. `/`). */
export function editorTabFromPath(pathname: string): EditorTab | null {
    if (pathname === '/settings') return SETTINGS_TAB;
    if (pathname === '/new-session') return NEW_SESSION_TAB;
    const match = /^\/sessions\/([^/]+)$/.exec(pathname);
    if (match?.[1]) return createSessionTab(match[1]);
    return null;
}

export function openEditorTab(tab: EditorTab): void {
    if (tabs.some((existing) => existing.id === tab.id)) return;
    tabs = [...tabs, tab];
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
