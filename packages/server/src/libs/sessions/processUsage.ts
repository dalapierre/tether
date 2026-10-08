import { readFile } from 'node:fs/promises';
import os from 'node:os';

/** Linux clock ticks per second (CLK_TCK); used to convert /proc utime+stime to seconds. */
const CLK_TCK = 100;

export type ProcessTreeSample = {
    /** Sum of utime+stime clock ticks across the process tree. */
    cpuTicks: number;
    /** Resident set size of the tree in bytes. */
    rssBytes: number;
};

/**
 * Read cumulative CPU ticks and RSS for `rootPid` and all descendants (Linux /proc).
 * Returns null when the root process is gone or /proc is unavailable.
 */
export async function sampleProcessTree(rootPid: number): Promise<ProcessTreeSample | null> {
    if (!Number.isInteger(rootPid) || rootPid <= 0) return null;
    if (process.platform !== 'linux') return null;

    const pids = await collectDescendantPids(rootPid);
    if (pids.length === 0) return null;

    let cpuTicks = 0;
    let rssBytes = 0;
    let anyAlive = false;

    await Promise.all(
        pids.map(async (pid) => {
            const stats = await readPidStats(pid);
            if (!stats) return;
            anyAlive = true;
            cpuTicks += stats.cpuTicks;
            rssBytes += stats.rssBytes;
        }),
    );

    if (!anyAlive) return null;
    return { cpuTicks, rssBytes };
}

/** Combine multiple root PIDs (e.g. agent PTY + shell PTY) into one sample. */
export async function sampleProcessTrees(rootPids: number[]): Promise<ProcessTreeSample | null> {
    const unique = [...new Set(rootPids.filter((pid) => Number.isInteger(pid) && pid > 0))];
    if (unique.length === 0) return null;

    const samples = await Promise.all(unique.map((pid) => sampleProcessTree(pid)));
    const alive = samples.filter((s): s is ProcessTreeSample => s !== null);
    if (alive.length === 0) return null;

    return {
        cpuTicks: alive.reduce((sum, s) => sum + s.cpuTicks, 0),
        rssBytes: alive.reduce((sum, s) => sum + s.rssBytes, 0),
    };
}

/**
 * CPU % of total machine capacity (all cores) and RAM % of total system memory,
 * from two samples taken `elapsedMs` apart.
 */
export function usageFromSamples(
    previous: ProcessTreeSample,
    next: ProcessTreeSample,
    elapsedMs: number,
): { cpuPercent: number; ramPercent: number } | null {
    if (elapsedMs <= 0) return null;

    const cpuCount = Math.max(1, os.cpus().length);
    const elapsedSec = elapsedMs / 1000;
    const deltaTicks = Math.max(0, next.cpuTicks - previous.cpuTicks);
    const cpuPercent = (deltaTicks / CLK_TCK / elapsedSec / cpuCount) * 100;
    const totalMem = os.totalmem();
    const ramPercent = totalMem > 0 ? (next.rssBytes / totalMem) * 100 : 0;

    return {
        cpuPercent: roundPercent(cpuPercent),
        ramPercent: roundPercent(ramPercent),
    };
}

function roundPercent(value: number): number {
    if (!Number.isFinite(value) || value < 0) return 0;
    // One decimal so small RSS on large-RAM hosts is not rounded to 0%.
    return Math.min(999, Math.round(value * 10) / 10);
}

async function collectDescendantPids(rootPid: number): Promise<number[]> {
    const found: number[] = [];
    const queue = [rootPid];
    const seen = new Set<number>();

    while (queue.length > 0) {
        const pid = queue.pop()!;
        if (seen.has(pid)) continue;
        seen.add(pid);
        found.push(pid);

        const children = await readChildren(pid);
        for (const child of children) {
            if (!seen.has(child)) queue.push(child);
        }
    }

    return found;
}

async function readChildren(pid: number): Promise<number[]> {
    try {
        const raw = await readFile(`/proc/${pid}/task/${pid}/children`, 'utf8');
        if (!raw.trim()) return [];
        return raw
            .trim()
            .split(/\s+/)
            .map((part) => Number(part))
            .filter((n) => Number.isInteger(n) && n > 0);
    } catch {
        return [];
    }
}

async function readPidStats(pid: number): Promise<{ cpuTicks: number; rssBytes: number } | null> {
    try {
        const [statRaw, statusRaw] = await Promise.all([
            readFile(`/proc/${pid}/stat`, 'utf8'),
            readFile(`/proc/${pid}/status`, 'utf8'),
        ]);

        const closeParen = statRaw.lastIndexOf(')');
        if (closeParen < 0) return null;
        const fields = statRaw
            .slice(closeParen + 1)
            .trim()
            .split(/\s+/);
        // Fields after comm: [0]=state … [11]=utime [12]=stime
        const utime = Number(fields[11]);
        const stime = Number(fields[12]);
        if (!Number.isFinite(utime) || !Number.isFinite(stime)) return null;

        const rssMatch = /^VmRSS:\s+(\d+)\s+kB$/m.exec(statusRaw);
        const rssKb = rssMatch ? Number(rssMatch[1]) : 0;
        if (!Number.isFinite(rssKb) || rssKb < 0) return null;

        return {
            cpuTicks: utime + stime,
            rssBytes: rssKb * 1024,
        };
    } catch {
        return null;
    }
}
