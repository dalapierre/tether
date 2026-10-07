import { isAgentId, type AgentId } from '@server/libs/agents/agents.js';
import { getRepositoryWorktreesDir, getSessionsFilePath, getTetherHomeDir } from '@server/libs/paths.js';
import { countBehindRemoteDefault, getRepository, listLocalBranches } from '@server/libs/repositories/store.js';
import {
    ensureCursorStatusIndicatorsEnabled,
    extractStatusFromOutput,
    type OscTitleParseState,
} from '@server/libs/sessions/agentStatus.js';
import {
    discardSessionDiffFile,
    getSessionDiffSummary,
    getSessionFileDiff,
    resolveReviewBaseSha,
    type SessionDiffSummary,
    type SessionFileDiff,
} from '@server/libs/sessions/diff.js';
import { createAgentSessionId, ensureWorkspaceTrusted, resolveHarnessLaunch } from '@server/libs/sessions/harness.js';
import { broadcastSessionStatus } from '@server/libs/sessions/statusHub.js';
import {
    appendOutput,
    appendShellOutput,
    attachShellClient,
    attachTerminalClient,
    broadcastStatus,
    clearTerminal,
    parseClientMessage,
} from '@server/libs/sessions/terminalHub.js';
import type { Session, SessionStatus, SessionType, StoredSession } from '@server/libs/sessions/types.js';
import { resolveUserShell } from '@server/libs/sessions/userShell.js';
import { getProfile } from '@server/libs/settings/store.js';
import { slugify, uniqueSlug } from '@server/libs/slug/slug.js';
import { execFile } from 'node:child_process';
import { access, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import type { IPty } from 'node-pty';
import * as pty from 'node-pty';
import type { WebSocket } from 'ws';

const execFileAsync = promisify(execFile);

type RuntimeSession = Omit<Session, 'behindDefault'> & {
    yoloMode: boolean;
    useWorktrees: boolean;
    /** True when this session created the branch; only then is the branch deleted on cleanup. */
    createdBranch: boolean;
    worktreePath: string;
    baseSha: string;
    /** Sticky: once true, review baseSha no longer auto-advances on upstream sync. */
    hadLocalCommits: boolean;
    agentSessionId: string | null;
    pty: IPty | null;
    /** Interactive user shell for the built-in terminal; lazy-spawned, killed with the session. */
    shellPty: IPty | null;
    oscTitleState: OscTitleParseState;
};

const sessions = new Map<string, RuntimeSession>();
const sessionsFile = getSessionsFilePath();
let persistChain: Promise<void> = Promise.resolve();

function isSessionStatus(value: unknown): value is SessionStatus {
    return value === 'ready' || value === 'busy' || value === 'error';
}

function isSessionType(value: unknown): value is SessionType {
    return value === 'coding' || value === 'conversation';
}

function isStoredSession(value: unknown): value is StoredSession {
    if (!value || typeof value !== 'object') return false;
    const session = value as Partial<StoredSession>;
    return (
        typeof session.id === 'string' &&
        session.id.length > 0 &&
        typeof session.name === 'string' &&
        typeof session.profileId === 'string' &&
        isAgentId(session.agent) &&
        isSessionType(session.type) &&
        (session.repositoryId === null || typeof session.repositoryId === 'string') &&
        (session.branch === null || typeof session.branch === 'string') &&
        isSessionStatus(session.status) &&
        typeof session.createdAt === 'number' &&
        typeof session.yoloMode === 'boolean' &&
        typeof session.useWorktrees === 'boolean' &&
        typeof session.createdBranch === 'boolean' &&
        typeof session.worktreePath === 'string' &&
        typeof session.baseSha === 'string' &&
        typeof session.hadLocalCommits === 'boolean' &&
        (session.agentSessionId === null || typeof session.agentSessionId === 'string')
    );
}

function toStored(session: RuntimeSession): StoredSession {
    return {
        id: session.id,
        name: session.name,
        profileId: session.profileId,
        agent: session.agent,
        type: session.type,
        repositoryId: session.repositoryId,
        branch: session.branch,
        status: session.status,
        createdAt: session.createdAt,
        yoloMode: session.yoloMode,
        useWorktrees: session.useWorktrees,
        createdBranch: session.createdBranch,
        worktreePath: session.worktreePath,
        baseSha: session.baseSha,
        hadLocalCommits: session.hadLocalCommits,
        agentSessionId: session.agentSessionId,
    };
}

async function writeSessionsFile(): Promise<void> {
    const items = [...sessions.values()].map(toStored).sort((a, b) => b.createdAt - a.createdAt);
    await mkdir(getTetherHomeDir(), { recursive: true });
    await writeFile(sessionsFile, `${JSON.stringify(items, null, 2)}\n`, 'utf8');
}

/** Serialize disk writes so concurrent status updates cannot clobber each other. */
function persistSessions(): Promise<void> {
    persistChain = persistChain.then(writeSessionsFile, writeSessionsFile);
    return persistChain;
}

async function readStoredSessions(): Promise<StoredSession[]> {
    let raw: string;
    try {
        raw = await readFile(sessionsFile, 'utf8');
    } catch (err: unknown) {
        if (err && typeof err === 'object' && 'code' in err && err.code === 'ENOENT') {
            return [];
        }
        throw err;
    }

    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch {
        console.error('Failed to parse sessions.json — starting with an empty session list');
        return [];
    }

    if (!Array.isArray(parsed)) {
        return [];
    }

    return parsed.filter(isStoredSession);
}

async function pathExists(target: string): Promise<boolean> {
    try {
        await access(target);
        return true;
    } catch {
        return false;
    }
}

async function toPublic(session: RuntimeSession): Promise<Session> {
    let behindDefault: number | null = null;
    if (session.type === 'coding' && session.branch) {
        behindDefault = await countBehindRemoteDefault(session.worktreePath, session.branch);
    }

    return {
        id: session.id,
        name: session.name,
        profileId: session.profileId,
        agent: session.agent,
        type: session.type,
        repositoryId: session.repositoryId,
        branch: session.branch,
        behindDefault,
        status: session.status,
        createdAt: session.createdAt,
    };
}

function setStatus(session: RuntimeSession, status: SessionStatus): void {
    if (session.status === status) return;
    session.status = status;
    broadcastStatus(session.id, status);
    broadcastSessionStatus({ sessionId: session.id, name: session.name, status });
    void persistSessions().catch((err: unknown) => {
        console.error(`Failed to persist status for session ${session.id}`, err);
    });
}

function applyAgentStatusFromOutput(session: RuntimeSession, data: string): void {
    if (session.status === 'error') return;
    const detected = extractStatusFromOutput(data, session.oscTitleState);
    if (detected) {
        setStatus(session, detected);
    }
}

async function listWorktreeLeaves(worktreesRoot: string): Promise<Set<string>> {
    try {
        const entries = await readdir(worktreesRoot, { withFileTypes: true });
        return new Set(entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name));
    } catch (err: unknown) {
        if (err && typeof err === 'object' && 'code' in err && err.code === 'ENOENT') {
            return new Set();
        }
        throw err;
    }
}

/** Leaf names under `worktreesRoot` that git still has registered (including stale paths). */
async function listGitWorktreeLeaves(repoPath: string, worktreesRoot: string): Promise<Set<string>> {
    try {
        const { stdout } = await execFileAsync('git', ['worktree', 'list', '--porcelain'], { cwd: repoPath });
        const root = path.resolve(worktreesRoot);
        const leaves = new Set<string>();
        for (const line of stdout.split('\n')) {
            if (!line.startsWith('worktree ')) continue;
            const worktreePath = line.slice('worktree '.length).trim();
            const resolved = path.resolve(worktreePath);
            if (resolved === root || resolved.startsWith(`${root}${path.sep}`)) {
                leaves.add(path.basename(resolved));
            }
        }
        return leaves;
    } catch {
        return new Set();
    }
}

async function pruneStaleWorktrees(repoPath: string): Promise<void> {
    await execFileAsync('git', ['worktree', 'prune'], { cwd: repoPath }).catch(() => undefined);
}

function isStaleWorktreeRegistrationError(message: string): boolean {
    return message.includes('missing but already registered') || message.includes('already registered worktree');
}

/** Matches git check-ref-format --branch rules for new branch names. */
function isValidBranchName(branch: string): boolean {
    if (!branch || branch === 'HEAD' || branch === '@') {
        return false;
    }
    if (branch.startsWith('-') || branch.startsWith('/') || branch.endsWith('/') || branch.endsWith('.')) {
        return false;
    }
    if (branch.includes('..') || branch.includes('//') || branch.includes('@{')) {
        return false;
    }
    // Reject ASCII controls, whitespace, and characters git forbids in refs.
    if (/[\x00-\x1f\x7f\s~^:?*\[\\]/.test(branch)) {
        return false;
    }
    for (const part of branch.split('/')) {
        if (!part || part.startsWith('.') || part.endsWith('.lock')) {
            return false;
        }
    }
    return true;
}

async function createWorktree(
    projectName: string,
    repoPath: string,
    leaf: string,
    branchName: string,
): Promise<{
    branch: string;
    worktreePath: string;
    baseSha: string;
    createdBranch: boolean;
}> {
    const localBranches = new Set(await listLocalBranches(repoPath));

    const requestedBranch = branchName.trim();
    if (!requestedBranch) {
        throw new Error('Branch is required');
    }
    if (!isValidBranchName(requestedBranch)) {
        throw new Error('Invalid branch name');
    }

    const branch = requestedBranch;
    const reuseExisting = localBranches.has(branch);

    const { stdout: headStdout } = await execFileAsync('git', ['rev-parse', reuseExisting ? branch : 'HEAD'], {
        cwd: repoPath,
    });
    const baseSha = headStdout.trim();

    const worktreesRoot = getRepositoryWorktreesDir(projectName);
    const worktreePath = path.join(worktreesRoot, leaf);
    await mkdir(worktreesRoot, { recursive: true });
    await pruneStaleWorktrees(repoPath);

    const addArgs = reuseExisting
        ? (['worktree', 'add', worktreePath, branch] as const)
        : (['worktree', 'add', '-b', branch, worktreePath] as const);

    try {
        await execFileAsync('git', [...addArgs], { cwd: repoPath });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        if (!isStaleWorktreeRegistrationError(message)) {
            throw err;
        }
        await pruneStaleWorktrees(repoPath);
        await execFileAsync('git', [...addArgs], { cwd: repoPath });
    }

    return { branch, worktreePath, baseSha, createdBranch: !reuseExisting };
}

async function spawnHarness(session: RuntimeSession, options: { resume?: boolean } = {}): Promise<void> {
    await ensureWorkspaceTrusted(session.agent, session.worktreePath);
    const harness = await resolveHarnessLaunch(session.agent, {
        yoloMode: session.yoloMode,
        agentSessionId: session.agentSessionId,
        resume: options.resume,
    });
    try {
        const term = pty.spawn(harness.file, harness.args, {
            name: 'xterm-256color',
            cols: 80,
            rows: 24,
            cwd: session.worktreePath,
            env: process.env as Record<string, string>,
        });
        session.pty = term;
        setStatus(session, 'busy');

        const argv = [harness.displayCommand, ...harness.displayArgs].join(' ');
        const label = options.resume ? 'resuming' : 'starting';
        appendOutput(session.id, `\r\n[${label} ${session.agent}: ${argv}]\r\n`);

        term.onData((data) => {
            appendOutput(session.id, data);
            applyAgentStatusFromOutput(session, data);
        });

        term.onExit(() => {
            session.pty = null;
            setStatus(session, 'error');
            appendOutput(session.id, '\r\n[agent exited]\r\n');
        });
    } catch (err: unknown) {
        session.pty = null;
        setStatus(session, 'error');
        const message = err instanceof Error ? err.message : 'Failed to start agent';
        appendOutput(session.id, `\r\n[failed to start agent: ${message}]\r\n`);
        throw err;
    }
}

export async function createSession(input: {
    profileId: string;
    name: string;
    repositoryId?: string;
    branch?: string;
}): Promise<Session> {
    const name = input.name.trim();
    if (!name) {
        throw new Error('Name is required');
    }

    const profile = await getProfile(input.profileId);
    if (!profile) {
        throw new Error('Profile not found');
    }

    const agent: AgentId = profile.agent;
    const yoloMode = profile.yoloMode;
    const useWorktrees = profile.useWorktrees;
    const profileId = profile.id;

    const repositoryId = input.repositoryId?.trim() ?? '';
    if (!repositoryId) {
        throw new Error('Repository is required');
    }

    if (useWorktrees) {
        const branch = input.branch?.trim() ?? '';
        if (!branch) {
            throw new Error('Branch is required');
        }
        return createCodingSession({ name, profileId, agent, yoloMode, useWorktrees: true, repositoryId, branch });
    }

    return createCodingSession({ name, profileId, agent, yoloMode, useWorktrees: false, repositoryId });
}

async function allocateSessionId(takenIds: Set<string>, name: string): Promise<string> {
    return uniqueSlug(slugify(name) || 'session', takenIds);
}

async function createCodingSession(input: {
    name: string;
    profileId: string;
    agent: AgentId;
    yoloMode: boolean;
    useWorktrees: boolean;
    repositoryId: string;
    branch?: string;
}): Promise<Session> {
    const repository = await getRepository(input.repositoryId);
    if (!repository) {
        throw new Error('Repository not found');
    }

    const takenIds = new Set(sessions.keys());
    if (input.useWorktrees) {
        const worktreesRoot = getRepositoryWorktreesDir(repository.id);
        await pruneStaleWorktrees(repository.path);
        for (const leaf of await listWorktreeLeaves(worktreesRoot)) {
            takenIds.add(leaf);
        }
        for (const leaf of await listGitWorktreeLeaves(repository.path, worktreesRoot)) {
            takenIds.add(leaf);
        }
        for (const session of sessions.values()) {
            if (session.repositoryId === repository.id && session.useWorktrees) {
                takenIds.add(path.basename(session.worktreePath));
            }
        }
    } else {
        for (const session of sessions.values()) {
            takenIds.add(session.id);
        }
    }

    const id = await allocateSessionId(takenIds, input.name);

    let workspace: { branch: string; worktreePath: string; baseSha: string; createdBranch: boolean };
    if (input.useWorktrees) {
        try {
            workspace = await createWorktree(repository.id, repository.path, id, input.branch ?? '');
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to create worktree';
            throw new Error(
                message.startsWith('Failed to create worktree') ? message : `Failed to create worktree: ${message}`,
            );
        }
    } else {
        const [{ stdout: headStdout }, { stdout: branchStdout }] = await Promise.all([
            execFileAsync('git', ['rev-parse', 'HEAD'], { cwd: repository.path }),
            execFileAsync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: repository.path }),
        ]);
        workspace = {
            branch: branchStdout.trim() || 'HEAD',
            worktreePath: repository.path,
            baseSha: headStdout.trim(),
            createdBranch: false,
        };
    }

    const agentSessionId = await createAgentSessionId(input.agent);

    const session: RuntimeSession = {
        id,
        name: input.name,
        profileId: input.profileId,
        agent: input.agent,
        type: 'coding',
        repositoryId: repository.id,
        branch: workspace.branch,
        status: 'busy',
        createdAt: Date.now(),
        yoloMode: input.yoloMode,
        useWorktrees: input.useWorktrees,
        createdBranch: workspace.createdBranch,
        worktreePath: workspace.worktreePath,
        baseSha: workspace.baseSha,
        hadLocalCommits: false,
        agentSessionId,
        pty: null,
        shellPty: null,
        oscTitleState: { pending: '' },
    };

    sessions.set(id, session);
    await persistSessions();

    try {
        if (input.agent === 'cursor') {
            await ensureCursorStatusIndicatorsEnabled();
        }
        await spawnHarness(session);
    } catch {
        // Session remains in error state with buffered failure output.
    }

    return await toPublic(session);
}

/**
 * Reload persisted sessions into memory and re-attach agent harnesses.
 * Call once during server startup before accepting requests.
 */
export async function restoreSessions(): Promise<void> {
    const stored = await readStoredSessions();
    if (stored.length === 0) {
        return;
    }

    console.log(`Restoring ${stored.length} session(s) from disk`);

    for (const item of stored) {
        if (sessions.has(item.id)) {
            continue;
        }

        const session: RuntimeSession = {
            id: item.id,
            name: item.name,
            profileId: item.profileId,
            agent: item.agent,
            type: item.type,
            repositoryId: item.repositoryId,
            branch: item.branch,
            status: 'error',
            createdAt: item.createdAt,
            yoloMode: item.yoloMode,
            useWorktrees: item.useWorktrees,
            createdBranch: item.createdBranch,
            worktreePath: item.worktreePath,
            baseSha: item.baseSha,
            hadLocalCommits: item.hadLocalCommits,
            agentSessionId: item.agentSessionId,
            pty: null,
            shellPty: null,
            oscTitleState: { pending: '' },
        };

        sessions.set(item.id, session);

        if (!(await pathExists(session.worktreePath))) {
            appendOutput(session.id, '\r\n[session restore failed: workspace missing]\r\n');
            continue;
        }

        try {
            if (session.agent === 'cursor') {
                await ensureCursorStatusIndicatorsEnabled();
            }
            await spawnHarness(session, { resume: Boolean(session.agentSessionId) });
        } catch (err: unknown) {
            console.error(`Failed to restore session ${session.id}`, err);
        }
    }

    await persistSessions();
}

export async function listSessions(repositoryId?: string): Promise<Session[]> {
    const items = [...sessions.values()]
        .filter((session) => !repositoryId || session.repositoryId === repositoryId)
        .sort((a, b) => b.createdAt - a.createdAt);
    return Promise.all(items.map((session) => toPublic(session)));
}

export function hasSession(id: string): boolean {
    return sessions.has(id);
}

export async function getSession(id: string): Promise<Session | null> {
    const session = sessions.get(id);
    return session ? toPublic(session) : null;
}

/** Respawn the agent for an exited session, resuming via agentSessionId when available. */
export async function restartSession(id: string): Promise<Session | null> {
    const session = sessions.get(id);
    if (!session) {
        return null;
    }
    if (session.pty) {
        throw new Error('Session is still running');
    }

    if (!(await pathExists(session.worktreePath))) {
        appendOutput(session.id, '\r\n[session restart failed: workspace missing]\r\n');
        setStatus(session, 'error');
        throw new Error('Workspace missing');
    }

    if (session.agent === 'cursor') {
        await ensureCursorStatusIndicatorsEnabled();
    }
    await spawnHarness(session, { resume: Boolean(session.agentSessionId) });
    return toPublic(session);
}

async function syncReviewBase(session: RuntimeSession): Promise<string> {
    const next = await resolveReviewBaseSha(session.worktreePath, session.branch, {
        baseSha: session.baseSha,
        hadLocalCommits: session.hadLocalCommits,
    });
    const changed = session.baseSha !== next.baseSha || session.hadLocalCommits !== next.hadLocalCommits;
    session.baseSha = next.baseSha;
    session.hadLocalCommits = next.hadLocalCommits;
    if (changed) {
        await persistSessions().catch((err: unknown) => {
            console.error(`Failed to persist review base for session ${session.id}`, err);
        });
    }
    return session.baseSha;
}

export async function getSessionDiff(id: string): Promise<SessionDiffSummary | null> {
    const session = sessions.get(id);
    if (!session || session.type !== 'coding') return null;
    const baseSha = await syncReviewBase(session);
    return getSessionDiffSummary(session.worktreePath, baseSha);
}

export async function getSessionDiffFile(id: string, filePath: string): Promise<SessionFileDiff | null> {
    const session = sessions.get(id);
    if (!session || session.type !== 'coding') return null;
    const baseSha = await syncReviewBase(session);
    return getSessionFileDiff(session.worktreePath, baseSha, filePath);
}

export async function discardSessionFileChange(id: string, filePath: string): Promise<boolean> {
    const session = sessions.get(id);
    if (!session || session.type !== 'coding') return false;
    const baseSha = await syncReviewBase(session);
    await discardSessionDiffFile(session.worktreePath, baseSha, filePath);
    return true;
}

function clampPtySize(cols: number, rows: number): { cols: number; rows: number } {
    return {
        cols: Math.max(20, Math.min(300, Math.floor(cols))),
        rows: Math.max(5, Math.min(120, Math.floor(rows))),
    };
}

function spawnUserShell(session: RuntimeSession): void {
    if (session.shellPty) {
        return;
    }

    const shell = resolveUserShell();
    try {
        const term = pty.spawn(shell.file, shell.args, {
            name: 'xterm-256color',
            cols: 80,
            rows: 24,
            cwd: session.worktreePath,
            env: process.env as Record<string, string>,
        });
        session.shellPty = term;

        term.onData((data) => {
            appendShellOutput(session.id, data);
        });

        term.onExit(() => {
            session.shellPty = null;
            appendShellOutput(session.id, '\r\n[shell exited]\r\n');
        });
    } catch (err: unknown) {
        session.shellPty = null;
        const message = err instanceof Error ? err.message : 'Failed to start shell';
        appendShellOutput(session.id, `\r\n[failed to start shell: ${message}]\r\n`);
    }
}

export function attachSessionTerminal(sessionId: string, socket: WebSocket): boolean {
    const session = sessions.get(sessionId);
    if (!session) {
        return false;
    }

    attachTerminalClient(sessionId, socket, session.status);

    socket.on('message', (raw) => {
        const text = typeof raw === 'string' ? raw : raw.toString();
        const message = parseClientMessage(text);
        if (!message || !session.pty) return;

        if (message.type === 'message') {
            const trimmed = message.text.trim();
            if (!trimmed) return;
            session.pty.write(`${trimmed}\r`);
            return;
        }

        if (message.type === 'input') {
            session.pty.write(message.data);
            return;
        }

        if (message.type === 'resize') {
            const { cols, rows } = clampPtySize(message.cols, message.rows);
            try {
                session.pty.resize(cols, rows);
            } catch {
                // ignore resize errors on exited pty
            }
        }
    });

    return true;
}

/** Attach a client to the session's user shell. Spawns the shell on first connect. */
export function attachSessionShell(sessionId: string, socket: WebSocket): boolean {
    const session = sessions.get(sessionId);
    if (!session) {
        return false;
    }

    spawnUserShell(session);
    attachShellClient(sessionId, socket);

    socket.on('message', (raw) => {
        const text = typeof raw === 'string' ? raw : raw.toString();
        const message = parseClientMessage(text);
        if (!message) return;

        if (!session.shellPty) {
            // Shell may have exited; respawn on next input/resize so reopen works.
            spawnUserShell(session);
        }
        if (!session.shellPty) return;

        if (message.type === 'message') {
            const trimmed = message.text.trim();
            if (!trimmed) return;
            session.shellPty.write(`${trimmed}\r`);
            return;
        }

        if (message.type === 'input') {
            session.shellPty.write(message.data);
            return;
        }

        if (message.type === 'resize') {
            const { cols, rows } = clampPtySize(message.cols, message.rows);
            try {
                session.shellPty.resize(cols, rows);
            } catch {
                // ignore resize errors on exited pty
            }
        }
    });

    return true;
}

async function cleanupWorktree(session: RuntimeSession): Promise<void> {
    if (session.type === 'conversation') {
        await rm(session.worktreePath, { recursive: true, force: true }).catch(() => undefined);
        return;
    }

    if (!session.useWorktrees) {
        // Session worked directly in the repository; leave the checkout alone.
        return;
    }

    if (!session.repositoryId) {
        await rm(session.worktreePath, { recursive: true, force: true }).catch(() => undefined);
        return;
    }

    const repository = await getRepository(session.repositoryId).catch(() => null);

    try {
        if (repository) {
            await execFileAsync('git', ['worktree', 'remove', '--force', session.worktreePath], {
                cwd: repository.path,
            });
        } else {
            await rm(session.worktreePath, { recursive: true, force: true });
        }
    } catch (err: unknown) {
        console.error(`Failed to remove worktree for session ${session.id}`, err);
        await rm(session.worktreePath, { recursive: true, force: true }).catch(() => undefined);
        if (repository) {
            await pruneStaleWorktrees(repository.path);
        }
    }

    if (repository && session.branch && session.createdBranch) {
        try {
            await execFileAsync('git', ['branch', '-D', session.branch], { cwd: repository.path });
        } catch {
            // Branch may already be gone or checked out elsewhere.
        }
    }
}

/** Remove a session from memory immediately; worktree cleanup runs in the background. */
export function deleteSession(id: string): boolean {
    const session = sessions.get(id);
    if (!session) {
        return false;
    }

    try {
        session.pty?.kill();
    } catch {
        // ignore
    }

    try {
        session.shellPty?.kill();
    } catch {
        // ignore
    }

    sessions.delete(id);
    clearTerminal(id);

    void persistSessions().catch((err: unknown) => {
        console.error(`Failed to persist sessions after deleting ${id}`, err);
    });
    void cleanupWorktree(session);

    return true;
}

/** Delete every session for a repository. Call before the repository is removed from settings. */
export function deleteSessionsForRepository(repositoryId: string): number {
    const ids = [...sessions.values()]
        .filter((session) => session.repositoryId === repositoryId)
        .map((session) => session.id);

    for (const id of ids) {
        deleteSession(id);
    }

    return ids.length;
}
