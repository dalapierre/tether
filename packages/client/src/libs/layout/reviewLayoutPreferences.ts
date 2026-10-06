import {
    getLocalStorageNumber,
    getLocalStorageJson,
    removeLocalStorageItem,
    setLocalStorageJson,
    setLocalStorageNumber,
} from '@client/libs/storage/localStorage';
import { getSessionLocalStorageItem, setSessionLocalStorageItem } from '@client/libs/storage/sessionLocalStorage';

const REVIEW_PANE_WIDTH_KEY = 'tether.layout.reviewPaneWidthPx';
const FILE_TREE_WIDTH_KEY = 'tether.layout.fileTreeWidthPx';
/** @deprecated Prefer per-session keys via sessionLocalStorage; kept for one-time migration. */
const LEGACY_REVIEW_PANEL_OPEN_BY_SESSION_KEY = 'tether.layout.reviewPanelOpenBySession';
const REVIEW_PANEL_OPEN_SUFFIX = 'reviewPanelOpen';

type ReviewPanelOpenBySession = Record<string, boolean>;

export const DEFAULT_REVIEW_PANE_WIDTH_PX = 520;
export const DEFAULT_FILE_TREE_WIDTH_PX = 176;

const MIN_REVIEW_PANE_WIDTH_PX = 320;
const MIN_FILE_TREE_WIDTH_PX = 120;
const MAX_FILE_TREE_WIDTH_PX = 420;

function maxReviewPaneWidthPx(): number {
    if (typeof window === 'undefined') {
        return 960;
    }
    return Math.max(MIN_REVIEW_PANE_WIDTH_PX, Math.floor(window.innerWidth * 0.75));
}

export function clampReviewPaneWidthPx(width: number): number {
    return Math.min(maxReviewPaneWidthPx(), Math.max(MIN_REVIEW_PANE_WIDTH_PX, Math.round(width)));
}

export function clampFileTreeWidthPx(width: number): number {
    return Math.min(MAX_FILE_TREE_WIDTH_PX, Math.max(MIN_FILE_TREE_WIDTH_PX, Math.round(width)));
}

export function getReviewPaneWidthPx(): number {
    const stored = getLocalStorageNumber(REVIEW_PANE_WIDTH_KEY);
    if (stored === null) {
        return DEFAULT_REVIEW_PANE_WIDTH_PX;
    }
    return clampReviewPaneWidthPx(stored);
}

export function setReviewPaneWidthPx(width: number): void {
    setLocalStorageNumber(REVIEW_PANE_WIDTH_KEY, clampReviewPaneWidthPx(width));
}

export function getFileTreeWidthPx(): number {
    const stored = getLocalStorageNumber(FILE_TREE_WIDTH_KEY);
    if (stored === null) {
        return DEFAULT_FILE_TREE_WIDTH_PX;
    }
    return clampFileTreeWidthPx(stored);
}

export function setFileTreeWidthPx(width: number): void {
    setLocalStorageNumber(FILE_TREE_WIDTH_KEY, clampFileTreeWidthPx(width));
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
