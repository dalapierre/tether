import {
    getLocalStorageJson,
    getLocalStorageNumber,
    setLocalStorageJson,
    setLocalStorageNumber,
} from '@client/libs/storage/localStorage';

const REVIEW_PANE_WIDTH_KEY = 'tether.layout.reviewPaneWidthPx';
const FILE_TREE_WIDTH_KEY = 'tether.layout.fileTreeWidthPx';
const REVIEW_PANEL_OPEN_BY_SESSION_KEY = 'tether.layout.reviewPanelOpenBySession';

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

function readReviewPanelOpenMap(): ReviewPanelOpenBySession {
    return getLocalStorageJson<ReviewPanelOpenBySession>(REVIEW_PANEL_OPEN_BY_SESSION_KEY) ?? {};
}

export function getReviewPanelOpen(sessionId: string): boolean | null {
    const map = readReviewPanelOpenMap();
    if (!(sessionId in map)) {
        return null;
    }
    return map[sessionId];
}

export function setReviewPanelOpen(sessionId: string, open: boolean): void {
    const map = readReviewPanelOpenMap();
    map[sessionId] = open;
    setLocalStorageJson(REVIEW_PANEL_OPEN_BY_SESSION_KEY, map);
}
