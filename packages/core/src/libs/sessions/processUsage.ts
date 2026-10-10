import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import os from 'node:os';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/** Linux clock ticks per second (CLK_TCK); used to convert /proc utime+stime to seconds. */
const CLK_TCK = 100;

/** Share one process-table snapshot across concurrent samples in the same poll tick. */
const PROCESS_TABLE_CACHE_TTL_MS = 500;

/** Windows KernelModeTime/UserModeTime are in 100-nanosecond units. */
const WINDOWS_TIME_PER_SECOND = 10_000_000;

export type ProcessTreeSample = {
    /** Cumulative CPU time (user + system) across the process tree, in seconds. */
    cpuSeconds: number;
    /** Resident set size of the tree in bytes. */
    rssBytes: number;
};

type ProcessRow = {
    pid: number;
    ppid: number;
    cpuSeconds: number;
    rssBytes: number;
};

type ProcessTable = {
    byPid: Map<number, ProcessRow>;
    childrenOf: Map<number, number[]>;
};

type ProcessTableCache = {
    loadedAt: number;
    promise: Promise<ProcessTable | null>;
};

let processTableCache: ProcessTableCache | null = null;

/**
 * Read cumulative CPU time and RSS for `rootPid` and all descendants.
 * Supports Linux (/proc), macOS (`ps`), and Windows (CIM via PowerShell).
 * Returns null when the root process is gone or sampling is unavailable.
 */
export async function sampleProcessTree(rootPid: number): Promise<ProcessTreeSample | null> {
    if (!Number.isInteger(rootPid) || rootPid <= 0) return null;

    if (process.platform === 'linux') {
        return sampleProcessTreeLinux(rootPid);
    }

    const table = await getProcessTable();
    if (!table) return null;
    return sampleFromTable(rootPid, table);
}

/** Combine multiple root PIDs (e.g. agent PTY + shell PTY) into one sample. */
export async function sampleProcessTrees(rootPids: number[]): Promise<ProcessTreeSample | null> {
    const unique = [...new Set(rootPids.filter((pid) => Number.isInteger(pid) && pid > 0))];
    if (unique.length === 0) return null;

    if (process.platform === 'linux') {
        const samples = await Promise.all(unique.map((pid) => sampleProcessTreeLinux(pid)));
        return mergeSamples(samples);
    }

    const table = await getProcessTable();
    if (!table) return null;
    return mergeSamples(unique.map((pid) => sampleFromTable(pid, table)));
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
    const deltaCpu = Math.max(0, next.cpuSeconds - previous.cpuSeconds);
    const cpuPercent = (deltaCpu / elapsedSec / cpuCount) * 100;
    const totalMem = os.totalmem();
    const ramPercent = totalMem > 0 ? (next.rssBytes / totalMem) * 100 : 0;

    return {
        cpuPercent: roundPercent(cpuPercent),
        ramPercent: roundPercent(ramPercent),
    };
}

function mergeSamples(samples: Array<ProcessTreeSample | null>): ProcessTreeSample | null {
    const alive = samples.filter((s): s is ProcessTreeSample => s !== null);
    if (alive.length === 0) return null;
    return {
        cpuSeconds: alive.reduce((sum, s) => sum + s.cpuSeconds, 0),
        rssBytes: alive.reduce((sum, s) => sum + s.rssBytes, 0),
    };
}

function roundPercent(value: number): number {
    if (!Number.isFinite(value) || value < 0) return 0;
    // One decimal so small RSS on large-RAM hosts is not rounded to 0%.
    return Math.min(999, Math.round(value * 10) / 10);
}

function sampleFromTable(rootPid: number, table: ProcessTable): ProcessTreeSample | null {
    if (!table.byPid.has(rootPid)) return null;

    let cpuSeconds = 0;
    let rssBytes = 0;
    let anyAlive = false;
    const queue = [rootPid];
    const seen = new Set<number>();

    while (queue.length > 0) {
        const pid = queue.pop()!;
        if (seen.has(pid)) continue;
        seen.add(pid);

        const row = table.byPid.get(pid);
        if (row) {
            anyAlive = true;
            cpuSeconds += row.cpuSeconds;
            rssBytes += row.rssBytes;
        }

        const children = table.childrenOf.get(pid);
        if (!children) continue;
        for (const child of children) {
            if (!seen.has(child)) queue.push(child);
        }
    }

    if (!anyAlive) return null;
    return { cpuSeconds, rssBytes };
}

function buildProcessTable(rows: ProcessRow[]): ProcessTable {
    const byPid = new Map<number, ProcessRow>();
    const childrenOf = new Map<number, number[]>();

    for (const row of rows) {
        byPid.set(row.pid, row);
        const siblings = childrenOf.get(row.ppid);
        if (siblings) siblings.push(row.pid);
        else childrenOf.set(row.ppid, [row.pid]);
    }

    return { byPid, childrenOf };
}

async function getProcessTable(): Promise<ProcessTable | null> {
    const now = Date.now();
    if (processTableCache && now - processTableCache.loadedAt < PROCESS_TABLE_CACHE_TTL_MS) {
        return processTableCache.promise;
    }

    const promise = loadProcessTable();
    processTableCache = { loadedAt: now, promise };
    try {
        return await promise;
    } catch {
        if (processTableCache?.promise === promise) processTableCache = null;
        return null;
    }
}

async function loadProcessTable(): Promise<ProcessTable | null> {
    if (process.platform === 'darwin') return loadDarwinProcessTable();
    if (process.platform === 'win32') return loadWindowsProcessTable();
    return null;
}

async function loadDarwinProcessTable(): Promise<ProcessTable | null> {
    try {
        const { stdout } = await execFileAsync('/bin/ps', ['-axo', 'pid=,ppid=,rss=,time='], {
            maxBuffer: 8 * 1024 * 1024,
            timeout: 5000,
        });
        const rows: ProcessRow[] = [];
        for (const line of stdout.split('\n')) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            const parts = trimmed.split(/\s+/);
            if (parts.length < 4) continue;

            const pid = Number(parts[0]);
            const ppid = Number(parts[1]);
            const rssKb = Number(parts[2]);
            const cpuSeconds = parsePsCpuTime(parts.slice(3).join(' '));
            if (!Number.isInteger(pid) || pid <= 0) continue;
            if (!Number.isInteger(ppid) || ppid < 0) continue;
            if (!Number.isFinite(rssKb) || rssKb < 0) continue;
            if (cpuSeconds === null) continue;

            rows.push({
                pid,
                ppid,
                cpuSeconds,
                rssBytes: rssKb * 1024,
            });
        }
        return buildProcessTable(rows);
    } catch {
        return null;
    }
}

/**
 * Parse BSD/macOS `ps` cputime values such as `0:01.23`, `1:02:03`, or `2-03:04:05`.
 */
function parsePsCpuTime(raw: string): number | null {
    const value = raw.trim();
    if (!value) return null;

    let days = 0;
    let rest = value;
    const daySplit = value.split('-');
    if (daySplit.length === 2) {
        days = Number(daySplit[0]);
        rest = daySplit[1]!;
        if (!Number.isFinite(days) || days < 0) return null;
    } else if (daySplit.length !== 1) {
        return null;
    }

    const parts = rest.split(':');
    if (parts.length < 2 || parts.length > 3) return null;

    const secondsPart = Number(parts[parts.length - 1]);
    const minutesPart = Number(parts[parts.length - 2]);
    const hoursPart = parts.length === 3 ? Number(parts[0]) : 0;
    if (![secondsPart, minutesPart, hoursPart].every((n) => Number.isFinite(n) && n >= 0)) return null;

    return days * 86400 + hoursPart * 3600 + minutesPart * 60 + secondsPart;
}

async function loadWindowsProcessTable(): Promise<ProcessTable | null> {
    try {
        const script =
            'Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,WorkingSetSize,UserModeTime,KernelModeTime | ConvertTo-Csv -NoTypeInformation';
        const { stdout } = await execFileAsync(
            'powershell.exe',
            ['-NoProfile', '-NonInteractive', '-Command', script],
            {
                maxBuffer: 16 * 1024 * 1024,
                timeout: 8000,
                windowsHide: true,
            },
        );

        const lines = stdout.split(/\r?\n/).filter((line) => line.trim().length > 0);
        if (lines.length < 2) return null;

        const rows: ProcessRow[] = [];
        for (const line of lines.slice(1)) {
            const cols = parseCsvLine(line);
            if (cols.length < 5) continue;

            const pid = Number(cols[0]);
            const ppid = Number(cols[1]);
            const workingSet = Number(cols[2]);
            const userMode = Number(cols[3]);
            const kernelMode = Number(cols[4]);
            if (!Number.isInteger(pid) || pid <= 0) continue;
            if (!Number.isInteger(ppid) || ppid < 0) continue;
            if (!Number.isFinite(workingSet) || workingSet < 0) continue;
            if (!Number.isFinite(userMode) || !Number.isFinite(kernelMode)) continue;

            rows.push({
                pid,
                ppid,
                cpuSeconds: (userMode + kernelMode) / WINDOWS_TIME_PER_SECOND,
                rssBytes: workingSet,
            });
        }

        return buildProcessTable(rows);
    } catch {
        return null;
    }
}

function parseCsvLine(line: string): string[] {
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const ch = line[i]!;
        if (inQuotes) {
            if (ch === '"') {
                if (line[i + 1] === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                current += ch;
            }
            continue;
        }

        if (ch === '"') {
            inQuotes = true;
        } else if (ch === ',') {
            fields.push(current);
            current = '';
        } else {
            current += ch;
        }
    }
    fields.push(current);
    return fields;
}

async function sampleProcessTreeLinux(rootPid: number): Promise<ProcessTreeSample | null> {
    const pids = await collectDescendantPids(rootPid);
    if (pids.length === 0) return null;

    let cpuSeconds = 0;
    let rssBytes = 0;
    let anyAlive = false;

    await Promise.all(
        pids.map(async (pid) => {
            const stats = await readPidStats(pid);
            if (!stats) return;
            anyAlive = true;
            cpuSeconds += stats.cpuSeconds;
            rssBytes += stats.rssBytes;
        }),
    );

    if (!anyAlive) return null;
    return { cpuSeconds, rssBytes };
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

async function readPidStats(pid: number): Promise<{ cpuSeconds: number; rssBytes: number } | null> {
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
            cpuSeconds: (utime + stime) / CLK_TCK,
            rssBytes: rssKb * 1024,
        };
    } catch {
        return null;
    }
}
