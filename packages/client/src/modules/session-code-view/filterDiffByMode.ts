import type { DiffViewMode } from '@client/libs/layout/reviewLayoutPreferences';

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
 * Line diff via LCS. Strips a common prefix/suffix first, then falls back to a
 * single replace hunk when the remaining matrices would be too large.
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

    const middle = diffLinesCore(a, b);
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

function diffLinesCore(a: string[], b: string[]): LineOp[] {
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

    // Guard pathological sizes (N*M cells would dominate).
    if (n * m > 2_000_000) {
        return [
            { type: 'delete', lines: a },
            { type: 'insert', lines: b },
        ];
    }

    // dp[i][j] = LCS length of a[0..i) and b[0..j)
    const dp: Uint32Array[] = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
    for (let i = 1; i <= n; i++) {
        const ai = a[i - 1]!;
        const row = dp[i]!;
        const prev = dp[i - 1]!;
        for (let j = 1; j <= m; j++) {
            if (ai === b[j - 1]) {
                row[j] = prev[j - 1]! + 1;
            } else {
                row[j] = Math.max(prev[j]!, row[j - 1]!);
            }
        }
    }

    const opsRev: LineOp[] = [];
    let i = n;
    let j = m;
    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
            opsRev.push({ type: 'equal', lines: [a[i - 1]!] });
            i--;
            j--;
        } else if (j > 0 && (i === 0 || dp[i]![j - 1]! >= dp[i - 1]![j]!)) {
            opsRev.push({ type: 'insert', lines: [b[j - 1]!] });
            j--;
        } else {
            opsRev.push({ type: 'delete', lines: [a[i - 1]!] });
            i--;
        }
    }
    opsRev.reverse();
    return coalesceOps(opsRev);
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
