import type { AgentId } from '@server/libs/agents/agents.js';
import { getConversationSessionDir, getConversationsDir, getRepositoryWorktreesDir } from '@server/libs/paths.js';
import { countBehindRemoteDefault, getRepository, listLocalBranches } from '@server/libs/repositories/store.js';
import {
    ensureCursorStatusIndicatorsEnabled,
    extractStatusFromOutput,
    type OscTitleParseState,
} from '@server/libs/sessions/agentStatus.js';
import {
    getSessionDiffSummary,
    getSessionFileDiff,
    resolveReviewBaseSha,
    type SessionDiffSummary,
    type SessionFileDiff,
} from '@server/libs/sessions/diff.js';
import { ensureWorkspaceTrusted, getHarnessCommand } from '@server/libs/sessions/harness.js';
import {
    appendOutput,
    attachTerminalClient,
    broadcastStatus,
    clearTerminal,
    parseClientMessage,
} from '@server/libs/sessions/terminalHub.js';
import type { Session, SessionStatus, SessionType } from '@server/libs/sessions/types.js';
import { getProfile } from '@server/libs/settings/store.js';
import { slugify, uniqueSlug } from '@server/libs/slug/slug.js';
import { execFile } from 'node:child_process';
import { mkdir, readdir, rm } from 'node:fs/promises';
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
    pty: IPty | null;
    oscTitleState: OscTitleParseState;
};

const sessions = new Map<string, RuntimeSession>();

async function toPublic(session: RuntimeSession): Promise<Session> {
    let behindDefault: number | null = null;
    if (session.type === 'coding' && session.branch) {
        behindDefault = await countBehindRemoteDefault(session.worktreePath, session.branch);
    }

    return {
        id: session.id,
        name: session.name,
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

    if (reuseExisting) {
        await execFileAsync('git', ['worktree', 'add', worktreePath, branch], { cwd: repoPath });
        return { branch, worktreePath, baseSha, createdBranch: false };
    }

    await execFileAsync('git', ['worktree', 'add', '-b', branch, worktreePath], { cwd: repoPath });
    return { branch, worktreePath, baseSha, createdBranch: true };
}

async function spawnHarness(session: RuntimeSession): Promise<void> {
    await ensureWorkspaceTrusted(session.agent, session.worktreePath);
    const harness = getHarnessCommand(session.agent, { yoloMode: session.yoloMode });
    try {
        const term = pty.spawn(harness.command, harness.args, {
            name: 'xterm-256color',
            cols: 80,
            rows: 24,
            cwd: session.worktreePath,
            env: process.env as Record<string, string>,
        });
        session.pty = term;
        setStatus(session, 'busy');

        const argv = [harness.command, ...harness.args].join(' ');
        appendOutput(session.id, `\r\n[starting ${session.agent}: ${argv}]\r\n`);

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
    const type: SessionType = profile.type;
    const yoloMode = profile.yoloMode;
    const useWorktrees = profile.type === 'coding' ? profile.useWorktrees : false;

    if (type === 'conversation') {
        return createConversationSession({ name, agent, yoloMode });
    }

    const repositoryId = input.repositoryId?.trim() ?? '';
    if (!repositoryId) {
        throw new Error('Repository is required');
    }

    if (useWorktrees) {
        const branch = input.branch?.trim() ?? '';
        if (!branch) {
            throw new Error('Branch is required');
        }
        return createCodingSession({ name, agent, yoloMode, useWorktrees: true, repositoryId, branch });
    }

    return createCodingSession({ name, agent, yoloMode, useWorktrees: false, repositoryId });
}

async function allocateSessionId(takenIds: Set<string>, name: string): Promise<string> {
    return uniqueSlug(slugify(name) || 'session', takenIds);
}

async function createConversationSession(input: { name: string; agent: AgentId; yoloMode: boolean }): Promise<Session> {
    const takenIds = new Set(sessions.keys());
    try {
        for (const leaf of await listWorktreeLeaves(getConversationsDir())) {
            takenIds.add(leaf);
        }
    } catch {
        // conversations dir may not exist yet
    }

    const id = await allocateSessionId(takenIds, input.name);
    const worktreePath = getConversationSessionDir(id);
    await mkdir(worktreePath, { recursive: true });

    const session: RuntimeSession = {
        id,
        name: input.name,
        agent: input.agent,
        type: 'conversation',
        repositoryId: null,
        branch: null,
        status: 'busy',
        createdAt: Date.now(),
        yoloMode: input.yoloMode,
        useWorktrees: false,
        createdBranch: false,
        worktreePath,
        baseSha: '',
        hadLocalCommits: false,
        pty: null,
        oscTitleState: { pending: '' },
    };

    sessions.set(id, session);

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

async function createCodingSession(input: {
    name: string;
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
        for (const leaf of await listWorktreeLeaves(worktreesRoot)) {
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

    const session: RuntimeSession = {
        id,
        name: input.name,
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
        pty: null,
        oscTitleState: { pending: '' },
    };

    sessions.set(id, session);

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

async function syncReviewBase(session: RuntimeSession): Promise<string> {
    const next = await resolveReviewBaseSha(session.worktreePath, session.branch, {
        baseSha: session.baseSha,
        hadLocalCommits: session.hadLocalCommits,
    });
    session.baseSha = next.baseSha;
    session.hadLocalCommits = next.hadLocalCommits;
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
            const cols = Math.max(20, Math.min(300, Math.floor(message.cols)));
            const rows = Math.max(5, Math.min(120, Math.floor(message.rows)));
            try {
                session.pty.resize(cols, rows);
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

    sessions.delete(id);
    clearTerminal(id);

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
