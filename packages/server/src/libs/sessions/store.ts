import type { AgentId } from '@server/libs/agents/agents.js';
import { getConversationSessionDir, getConversationsDir, getRepositoryWorktreesDir } from '@server/libs/paths.js';
import { getRepository } from '@server/libs/repositories/store.js';
import {
    ensureCursorStatusIndicatorsEnabled,
    extractStatusFromOutput,
    type OscTitleParseState,
} from '@server/libs/sessions/agentStatus.js';
import {
    getSessionDiffSummary,
    getSessionFileDiff,
    type SessionDiffSummary,
    type SessionFileDiff,
} from '@server/libs/sessions/diff.js';
import { getHarnessCommand } from '@server/libs/sessions/harness.js';
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

type RuntimeSession = Session & {
    yoloMode: boolean;
    useWorktrees: boolean;
    worktreePath: string;
    baseSha: string;
    pty: IPty | null;
    oscTitleState: OscTitleParseState;
};

const sessions = new Map<string, RuntimeSession>();

function toPublic(session: RuntimeSession): Session {
    return {
        id: session.id,
        name: session.name,
        agent: session.agent,
        type: session.type,
        repositoryId: session.repositoryId,
        branch: session.branch,
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

async function listLocalBranches(repoPath: string): Promise<Set<string>> {
    try {
        const { stdout } = await execFileAsync('git', ['branch', '--list', '--format=%(refname:short)'], {
            cwd: repoPath,
        });
        return new Set(
            stdout
                .split('\n')
                .map((line) => line.trim())
                .filter(Boolean),
        );
    } catch {
        return new Set();
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
}> {
    const takenBranches = await listLocalBranches(repoPath);
    for (const session of sessions.values()) {
        if (session.branch) {
            takenBranches.add(session.branch);
        }
    }

    const requestedBranch = branchName.trim();
    if (!requestedBranch) {
        throw new Error('Branch is required');
    }
    if (!isValidBranchName(requestedBranch)) {
        throw new Error('Invalid branch name');
    }
    if (takenBranches.has(requestedBranch)) {
        throw new Error(`Branch already exists: ${requestedBranch}`);
    }
    const branch = requestedBranch;

    const { stdout: headStdout } = await execFileAsync('git', ['rev-parse', 'HEAD'], { cwd: repoPath });
    const baseSha = headStdout.trim();

    const worktreesRoot = getRepositoryWorktreesDir(projectName);
    const worktreePath = path.join(worktreesRoot, leaf);
    await mkdir(worktreesRoot, { recursive: true });
    await execFileAsync('git', ['worktree', 'add', '-b', branch, worktreePath], { cwd: repoPath });
    return { branch, worktreePath, baseSha };
}

function spawnHarness(session: RuntimeSession): void {
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
        worktreePath,
        baseSha: '',
        pty: null,
        oscTitleState: { pending: '' },
    };

    sessions.set(id, session);

    try {
        if (input.agent === 'cursor') {
            await ensureCursorStatusIndicatorsEnabled();
        }
        spawnHarness(session);
    } catch {
        // Session remains in error state with buffered failure output.
    }

    return toPublic(session);
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

    let workspace: { branch: string; worktreePath: string; baseSha: string };
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
        worktreePath: workspace.worktreePath,
        baseSha: workspace.baseSha,
        pty: null,
        oscTitleState: { pending: '' },
    };

    sessions.set(id, session);

    try {
        if (input.agent === 'cursor') {
            await ensureCursorStatusIndicatorsEnabled();
        }
        spawnHarness(session);
    } catch {
        // Session remains in error state with buffered failure output.
    }

    return toPublic(session);
}

export function listSessions(repositoryId?: string): Session[] {
    const items = [...sessions.values()]
        .filter((session) => !repositoryId || session.repositoryId === repositoryId)
        .sort((a, b) => b.createdAt - a.createdAt);
    return items.map(toPublic);
}

export function getSession(id: string): Session | null {
    const session = sessions.get(id);
    return session ? toPublic(session) : null;
}

export async function getSessionDiff(id: string): Promise<SessionDiffSummary | null> {
    const session = sessions.get(id);
    if (!session || session.type !== 'coding') return null;
    return getSessionDiffSummary(session.worktreePath, session.baseSha);
}

export async function getSessionDiffFile(id: string, filePath: string): Promise<SessionFileDiff | null> {
    const session = sessions.get(id);
    if (!session || session.type !== 'coding') return null;
    return getSessionFileDiff(session.worktreePath, session.baseSha, filePath);
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

    if (repository && session.branch) {
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
