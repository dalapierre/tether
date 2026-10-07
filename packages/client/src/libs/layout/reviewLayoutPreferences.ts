import {
    getLocalStorageNumber,
    getLocalStorageJson,
    removeLocalStorageItem,
    setLocalStorageJson,
    setLocalStorageNumber,
} from '@client/libs/storage/localStorage';
import {
    getSessionLocalStorageItem,
    removeSessionLocalStorageItem,
    setSessionLocalStorageItem,
} from '@client/libs/storage/sessionLocalStorage';

const REVIEW_PANE_WIDTH_PCT_KEY = 'tether.layout.reviewPaneWidthPct';
const SHELL_PANE_HEIGHT_PCT_KEY = 'tether.layout.shellPaneHeightPct';
const FILE_TREE_WIDTH_PX_KEY = 'tether.layout.fileTreeWidthPx';
const SHELL_PANEL_OPEN_SUFFIX = 'shellPanelOpen';
/** @deprecated Migrated to reviewPaneWidthPct. */
const LEGACY_REVIEW_PANE_WIDTH_PX_KEY = 'tether.layout.reviewPaneWidthPx';
/** @deprecated Migrated back to fileTreeWidthPx. */
const LEGACY_FILE_TREE_WIDTH_PCT_KEY = 'tether.layout.fileTreeWidthPct';
/** @deprecated Prefer per-session keys via sessionLocalStorage; kept for one-time migration. */
const LEGACY_REVIEW_PANEL_OPEN_BY_SESSION_KEY = 'tether.layout.reviewPanelOpenBySession';
const REVIEW_PANEL_OPEN_SUFFIX = 'reviewPanelOpen';
/** Stores path + scroll; value may be a legacy plain path string. */
const SELECTED_DIFF_FILE_SUFFIX = 'selectedDiffPath';

type ReviewPanelOpenBySession = Record<string, boolean>;

export type SelectedDiffFileState = {
    path: string;
    /** First visible line in the code diff editor. */
    anchorLine: number;
    /** 0–1 scroll ratio (used for markdown preview). */
    scrollRatio: number;
};

export const DEFAULT_REVIEW_PANE_WIDTH_PCT = 40;
export const DEFAULT_SHELL_PANE_HEIGHT_PCT = 30;
export const DEFAULT_FILE_TREE_WIDTH_PX = 176;

const MIN_REVIEW_PANE_WIDTH_PCT = 15;
const MAX_REVIEW_PANE_WIDTH_PCT = 90;
const MIN_SHELL_PANE_HEIGHT_PCT = 10;
const MAX_SHELL_PANE_HEIGHT_PCT = 90;
const MIN_FILE_TREE_WIDTH_PX = 120;
const MAX_FILE_TREE_WIDTH_PX = 420;

function viewportWidthPx(): number {
    if (typeof window === 'undefined') {
        return 1280;
    }
    return Math.max(1, window.innerWidth);
}

function roundPct(value: number): number {
    return Math.round(value * 10) / 10;
}

export function clampReviewPaneWidthPct(pct: number): number {
    return Math.min(MAX_REVIEW_PANE_WIDTH_PCT, Math.max(MIN_REVIEW_PANE_WIDTH_PCT, roundPct(pct)));
}

export function clampShellPaneHeightPct(pct: number): number {
    return Math.min(MAX_SHELL_PANE_HEIGHT_PCT, Math.max(MIN_SHELL_PANE_HEIGHT_PCT, roundPct(pct)));
}

export function clampFileTreeWidthPx(width: number): number {
    return Math.min(MAX_FILE_TREE_WIDTH_PX, Math.max(MIN_FILE_TREE_WIDTH_PX, Math.round(width)));
}

/** Convert a horizontal pixel delta into a percentage of `basePx`. */
export function deltaPxToPct(deltaPx: number, basePx: number): number {
    return (deltaPx / Math.max(1, basePx)) * 100;
}

function takeLegacyWidthNumber(key: string): number | null {
    const stored = getLocalStorageNumber(key);
    if (stored === null) {
        return null;
    }
    removeLocalStorageItem(key);
    return Number.isFinite(stored) ? stored : null;
}

function migrateLegacyReviewPaneWidthPx(): number | null {
    const storedPx = takeLegacyWidthNumber(LEGACY_REVIEW_PANE_WIDTH_PX_KEY);
    if (storedPx === null) {
        return null;
    }
    return clampReviewPaneWidthPct((storedPx / viewportWidthPx()) * 100);
}

function migrateLegacyFileTreeWidthPct(): number | null {
    const storedPct = takeLegacyWidthNumber(LEGACY_FILE_TREE_WIDTH_PCT_KEY);
    if (storedPct === null) {
        return null;
    }
    const reviewPaneWidthPx = (getReviewPaneWidthPct() / 100) * viewportWidthPx();
    return clampFileTreeWidthPx((storedPct / 100) * reviewPaneWidthPx);
}

export function getReviewPaneWidthPct(): number {
    const stored = getLocalStorageNumber(REVIEW_PANE_WIDTH_PCT_KEY);
    if (stored !== null) {
        return clampReviewPaneWidthPct(stored);
    }

    const migrated = migrateLegacyReviewPaneWidthPx();
    if (migrated !== null) {
        setLocalStorageNumber(REVIEW_PANE_WIDTH_PCT_KEY, migrated);
        return migrated;
    }

    return DEFAULT_REVIEW_PANE_WIDTH_PCT;
}

export function setReviewPaneWidthPct(pct: number): void {
    setLocalStorageNumber(REVIEW_PANE_WIDTH_PCT_KEY, clampReviewPaneWidthPct(pct));
}

export function getShellPaneHeightPct(): number {
    const stored = getLocalStorageNumber(SHELL_PANE_HEIGHT_PCT_KEY);
    if (stored !== null) {
        return clampShellPaneHeightPct(stored);
    }
    return DEFAULT_SHELL_PANE_HEIGHT_PCT;
}

export function setShellPaneHeightPct(pct: number): void {
    setLocalStorageNumber(SHELL_PANE_HEIGHT_PCT_KEY, clampShellPaneHeightPct(pct));
}

export function getShellPanelOpen(sessionId: string): boolean | null {
    const raw = getSessionLocalStorageItem(sessionId, SHELL_PANEL_OPEN_SUFFIX);
    if (raw === '1') return true;
    if (raw === '0') return false;
    return null;
}

export function setShellPanelOpen(sessionId: string, open: boolean): void {
    setSessionLocalStorageItem(sessionId, SHELL_PANEL_OPEN_SUFFIX, open ? '1' : '0');
}

export function getFileTreeWidthPx(): number {
    const stored = getLocalStorageNumber(FILE_TREE_WIDTH_PX_KEY);
    if (stored !== null) {
        return clampFileTreeWidthPx(stored);
    }

    const migrated = migrateLegacyFileTreeWidthPct();
    if (migrated !== null) {
        setLocalStorageNumber(FILE_TREE_WIDTH_PX_KEY, migrated);
        return migrated;
    }

    return DEFAULT_FILE_TREE_WIDTH_PX;
}

export function setFileTreeWidthPx(width: number): void {
    setLocalStorageNumber(FILE_TREE_WIDTH_PX_KEY, clampFileTreeWidthPx(width));
}

function readLegacyReviewPanelOpenMap(): ReviewPanelOpenBySession {
    return getLocalStorageJson<ReviewPanelOpenBySession>(LEGACY_REVIEW_PANEL_OPEN_BY_SESSION_KEY) ?? {};
}

function takeLegacyReviewPanelOpen(sessionId: string): boolean | null {
    const map = readLegacyReviewPanelOpenMap();
    if (!(sessionId in map)) {
        return null;
    }
    const value = map[sessionId];
    delete map[sessionId];
    if (Object.keys(map).length === 0) {
        removeLocalStorageItem(LEGACY_REVIEW_PANEL_OPEN_BY_SESSION_KEY);
    } else {
        setLocalStorageJson(LEGACY_REVIEW_PANEL_OPEN_BY_SESSION_KEY, map);
    }
    return value;
}

export function getReviewPanelOpen(sessionId: string): boolean | null {
    const raw = getSessionLocalStorageItem(sessionId, REVIEW_PANEL_OPEN_SUFFIX);
    if (raw === '1') return true;
    if (raw === '0') return false;

    const legacy = takeLegacyReviewPanelOpen(sessionId);
    if (legacy === null) {
        return null;
    }
    setReviewPanelOpen(sessionId, legacy);
    return legacy;
}

export function setReviewPanelOpen(sessionId: string, open: boolean): void {
    setSessionLocalStorageItem(sessionId, REVIEW_PANEL_OPEN_SUFFIX, open ? '1' : '0');
}

function clampScrollRatio(value: number): number {
    if (!Number.isFinite(value)) {
        return 0;
    }
    return Math.min(1, Math.max(0, value));
}

function clampAnchorLine(value: number): number {
    if (!Number.isFinite(value) || value < 1) {
        return 1;
    }
    return Math.floor(value);
}

function parseSelectedDiffFileState(raw: string): SelectedDiffFileState | null {
    const trimmed = raw.trim();
    if (!trimmed) {
        return null;
    }

    if (trimmed.startsWith('{')) {
        try {
            const parsed = JSON.parse(trimmed) as Partial<SelectedDiffFileState>;
            if (typeof parsed.path !== 'string') {
                return null;
            }
            const path = parsed.path.trim();
            if (!path) {
                return null;
            }
            return {
                path,
                anchorLine: clampAnchorLine(typeof parsed.anchorLine === 'number' ? parsed.anchorLine : 1),
                scrollRatio: clampScrollRatio(typeof parsed.scrollRatio === 'number' ? parsed.scrollRatio : 0),
            };
        } catch {
            return null;
        }
    }

    // Legacy: plain path string.
    return { path: trimmed, anchorLine: 1, scrollRatio: 0 };
}

export function getSelectedDiffFileState(sessionId: string): SelectedDiffFileState | null {
    const raw = getSessionLocalStorageItem(sessionId, SELECTED_DIFF_FILE_SUFFIX);
    if (raw === null) {
        return null;
    }
    return parseSelectedDiffFileState(raw);
}

export function getSelectedDiffPath(sessionId: string): string | null {
    return getSelectedDiffFileState(sessionId)?.path ?? null;
}

export function setSelectedDiffFileState(sessionId: string, state: SelectedDiffFileState | null): void {
    if (!state) {
        removeSessionLocalStorageItem(sessionId, SELECTED_DIFF_FILE_SUFFIX);
        return;
    }
    const path = state.path.trim();
    if (!path) {
        removeSessionLocalStorageItem(sessionId, SELECTED_DIFF_FILE_SUFFIX);
        return;
    }
    setSessionLocalStorageItem(
        sessionId,
        SELECTED_DIFF_FILE_SUFFIX,
        JSON.stringify({
            path,
            anchorLine: clampAnchorLine(state.anchorLine),
            scrollRatio: clampScrollRatio(state.scrollRatio),
        }),
    );
}
