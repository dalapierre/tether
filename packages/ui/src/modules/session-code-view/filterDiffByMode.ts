import type { DiffViewMode } from '@ui/libs/layout/reviewLayoutPreferences';

export type { DiffViewMode };

type LineOp =
    { type: 'equal'; lines: string[] } | { type: 'insert'; lines: string[] } | { type: 'delete'; lines: string[] };

function splitLines(text: string): string[] {
    return text.split('\n');
}

function joinLines(lines: string[]): string {
    return lines.join('\n');
}

function coalesceOps(ops: LineOp[]): LineOp[] {
    const out: LineOp[] = [];
    for (const op of ops) {
        if (op.lines.length === 0) {
            continue;
        }
        const last = out[out.length - 1];
        if (last && last.type === op.type) {
            last.lines.push(...op.lines);
        } else {
            out.push({ type: op.type, lines: [...op.lines] });
        }
    }
    return out;
}

/**
 * Line diff via Myers O(ND). Strips a common prefix/suffix first so the
 * remaining edit distance stays small for typical review diffs.
 */
function diffLines(originalLines: string[], modifiedLines: string[]): LineOp[] {
    let start = 0;
    const minLen = Math.min(originalLines.length, modifiedLines.length);
    while (start < minLen && originalLines[start] === modifiedLines[start]) {
        start++;
    }

    let endOrig = originalLines.length;
    let endMod = modifiedLines.length;
    while (endOrig > start && endMod > start && originalLines[endOrig - 1] === modifiedLines[endMod - 1]) {
        endOrig--;
        endMod--;
    }

    const prefix = originalLines.slice(0, start);
    const suffix = originalLines.slice(endOrig);
    const a = originalLines.slice(start, endOrig);
    const b = modifiedLines.slice(start, endMod);

    const middle = diffLinesMyers(a, b);
    const ops: LineOp[] = [];
    if (prefix.length > 0) {
        ops.push({ type: 'equal', lines: prefix });
    }
    ops.push(...middle);
    if (suffix.length > 0) {
        ops.push({ type: 'equal', lines: suffix });
    }
    return coalesceOps(ops);
}

type SnakePath = {
    prev: SnakePath | null;
    x: number;
    y: number;
    length: number;
};

/** Int32 map that supports negative diagonal indices. */
class DiagonalInt32Map {
    private positive = new Int32Array(16);
    private negative = new Int32Array(16);

    get(idx: number): number {
        if (idx < 0) {
            return this.negative[-idx - 1] ?? 0;
        }
        return this.positive[idx] ?? 0;
    }

    set(idx: number, value: number): void {
        if (idx < 0) {
            const i = -idx - 1;
            if (i >= this.negative.length) {
                const next = new Int32Array(Math.max(i + 1, this.negative.length * 2));
                next.set(this.negative);
                this.negative = next;
            }
            this.negative[i] = value;
            return;
        }
        if (idx >= this.positive.length) {
            const next = new Int32Array(Math.max(idx + 1, this.positive.length * 2));
            next.set(this.positive);
            this.positive = next;
        }
        this.positive[idx] = value;
    }
}

class DiagonalPathMap {
    private positive: Array<SnakePath | null> = [];
    private negative: Array<SnakePath | null> = [];

    get(idx: number): SnakePath | null {
        if (idx < 0) {
            return this.negative[-idx - 1] ?? null;
        }
        return this.positive[idx] ?? null;
    }

    set(idx: number, value: SnakePath | null): void {
        if (idx < 0) {
            this.negative[-idx - 1] = value;
            return;
        }
        this.positive[idx] = value;
    }
}

/**
 * Myers O(ND) line diff. Tracks snake paths so large files with a small edit
 * distance stay accurate (unlike quadratic LCS with a replace-all fallback).
 */
function diffLinesMyers(a: string[], b: string[]): LineOp[] {
    const n = a.length;
    const m = b.length;
    if (n === 0 && m === 0) {
        return [];
    }
    if (n === 0) {
        return [{ type: 'insert', lines: b }];
    }
    if (m === 0) {
        return [{ type: 'delete', lines: a }];
    }

    const snake = (x: number, y: number): number => {
        while (x < n && y < m && a[x] === b[y]) {
            x++;
            y++;
        }
        return x;
    };

    const V = new DiagonalInt32Map();
    const paths = new DiagonalPathMap();
    const firstSnake = snake(0, 0);
    V.set(0, firstSnake);
    paths.set(0, firstSnake === 0 ? null : { prev: null, x: 0, y: 0, length: firstSnake });

    let d = 0;
    let finalK = 0;
    found: for (;;) {
        d++;
        const lower = -Math.min(d, m + (d % 2));
        const upper = Math.min(d, n + (d % 2));
        for (let k = lower; k <= upper; k += 2) {
            const fromTop = k === upper ? -1 : V.get(k + 1);
            const fromLeft = k === lower ? -1 : V.get(k - 1) + 1;
            const xStart = Math.min(Math.max(fromTop, fromLeft), n);
            const yStart = xStart - k;
            if (xStart > n || yStart > m) {
                continue;
            }
            const xEnd = snake(xStart, yStart);
            V.set(k, xEnd);
            const lastPath = xStart === fromTop ? paths.get(k + 1) : paths.get(k - 1);
            paths.set(k, xEnd !== xStart ? { prev: lastPath, x: xStart, y: yStart, length: xEnd - xStart } : lastPath);
            if (xEnd === n && xEnd - k === m) {
                finalK = k;
                break found;
            }
        }
        // Pathological safety: if edit distance explodes, fall back to a single replace.
        if (d > n + m) {
            return [
                { type: 'delete', lines: a },
                { type: 'insert', lines: b },
            ];
        }
    }

    // Walk snakes reverse → changed ranges between aligning equal runs.
    type Change = { aStart: number; aEnd: number; bStart: number; bEnd: number };
    const changes: Change[] = [];
    let lastA = n;
    let lastB = m;
    let path = paths.get(finalK);
    for (;;) {
        const endX = path ? path.x + path.length : 0;
        const endY = path ? path.y + path.length : 0;
        if (endX !== lastA || endY !== lastB) {
            changes.push({ aStart: endX, aEnd: lastA, bStart: endY, bEnd: lastB });
        }
        if (!path) {
            break;
        }
        lastA = path.x;
        lastB = path.y;
        path = path.prev;
    }
    changes.reverse();

    const ops: LineOp[] = [];
    let aPos = 0;
    let bPos = 0;
    for (const change of changes) {
        if (aPos < change.aStart) {
            ops.push({ type: 'equal', lines: a.slice(aPos, change.aStart) });
        }
        if (change.aStart < change.aEnd) {
            ops.push({ type: 'delete', lines: a.slice(change.aStart, change.aEnd) });
        }
        if (change.bStart < change.bEnd) {
            ops.push({ type: 'insert', lines: b.slice(change.bStart, change.bEnd) });
        }
        aPos = change.aEnd;
        bPos = change.bEnd;
    }
    if (aPos < n) {
        ops.push({ type: 'equal', lines: a.slice(aPos) });
    } else if (bPos < m) {
        // Should not happen when changes cover the SES, but keep modified tail if needed.
        ops.push({ type: 'insert', lines: b.slice(bPos) });
    }
    return coalesceOps(ops);
}

function filterOps(ops: LineOp[], mode: 'negative' | 'positive'): { original: string[]; modified: string[] } {
    const original: string[] = [];
    const modified: string[] = [];
    for (const op of ops) {
        if (op.type === 'equal') {
            original.push(...op.lines);
            modified.push(...op.lines);
            continue;
        }
        if (mode === 'positive') {
            if (op.type === 'insert') {
                modified.push(...op.lines);
            }
            // Skip deletions so only additions remain visible.
            continue;
        }
        if (op.type === 'delete') {
            original.push(...op.lines);
        }
        // Skip insertions so only deletions remain visible.
    }
    return { original, modified };
}

/** Rewrite original/modified so the DiffEditor only shows the requested change kind. */
export function applyDiffViewMode(
    original: string,
    modified: string,
    mode: DiffViewMode,
): { original: string; modified: string } {
    if (mode === 'split') {
        return { original, modified };
    }
    const ops = diffLines(splitLines(original), splitLines(modified));
    const filtered = filterOps(ops, mode);
    return {
        original: joinLines(filtered.original),
        modified: joinLines(filtered.modified),
    };
}
