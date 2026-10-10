import {
    getLocalStorageItem,
    getLocalStorageJson,
    removeLocalStorageItem,
    removeLocalStorageKeysWithPrefix,
    setLocalStorageItem,
    setLocalStorageJson,
} from '@ui/libs/storage/localStorage';

/** All per-session client prefs live under `tether.session.<sessionId>.…`. */
const SESSION_KEY_ROOT = 'tether.session.';

/** @deprecated Shared map used before per-session keys; scrubbed on delete/migration. */
const LEGACY_REVIEW_PANEL_OPEN_BY_SESSION_KEY = 'tether.layout.reviewPanelOpenBySession';

export function sessionLocalStorageKey(sessionId: string, suffix: string): string {
    return `${SESSION_KEY_ROOT}${sessionId}.${suffix}`;
}

function clearLegacySessionEntries(sessionId: string): void {
    const map = getLocalStorageJson<Record<string, unknown>>(LEGACY_REVIEW_PANEL_OPEN_BY_SESSION_KEY);
    if (!map || !(sessionId in map)) {
        return;
    }
    delete map[sessionId];
    if (Object.keys(map).length === 0) {
        removeLocalStorageItem(LEGACY_REVIEW_PANEL_OPEN_BY_SESSION_KEY);
    } else {
        setLocalStorageJson(LEGACY_REVIEW_PANEL_OPEN_BY_SESSION_KEY, map);
    }
}

/** Drop every localStorage entry scoped to this session id/slug. */
export function clearSessionLocalStorage(sessionId: string): void {
    const id = sessionId.trim();
    if (!id) {
        return;
    }
    removeLocalStorageKeysWithPrefix(`${SESSION_KEY_ROOT}${id}.`);
    clearLegacySessionEntries(id);
}

export function getSessionLocalStorageItem(sessionId: string, suffix: string): string | null {
    return getLocalStorageItem(sessionLocalStorageKey(sessionId, suffix));
}

export function setSessionLocalStorageItem(sessionId: string, suffix: string, value: string): boolean {
    return setLocalStorageItem(sessionLocalStorageKey(sessionId, suffix), value);
}

export function removeSessionLocalStorageItem(sessionId: string, suffix: string): void {
    removeLocalStorageItem(sessionLocalStorageKey(sessionId, suffix));
}
