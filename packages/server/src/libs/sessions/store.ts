import type { AgentId } from '@server/libs/agents/agents.js';
import { getRepositoryWorktreesDir } from '@server/libs/paths.js';
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
import type { Session, SessionStatus } from '@server/libs/sessions/types.js';
import { slugify, uniqueSlug } from '@server/libs/slug/slug.js';
import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdir, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import type { IPty } from 'node-pty';
import * as pty from 'node-pty';
import type { WebSocket } from 'ws';

const execFileAsync = promisify(execFile);

type RuntimeSession = Session & {
    yoloMode: boolean;
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

function isValidBranchName(branch: string): boolean {
    if (!branch || branch === 'HEAD') {
        return false;
    }
    if (branch.startsWith('-') || branch.startsWith('.') || branch.endsWith('.') || branch.endsWith('/')) {
        return false;
    }
    if (branch.includes('..') || branch.includes('//') || branch.includes('@{') || branch.endsWith('.lock')) {
        return false;
    }
    // Reject characters git will not accept in branch names.
    return !/[\s~^:?*\[\\]/.test(branch);
}

async function createWorktree(
    projectName: string,
    repoPath: string,
    sessionName: string,
    branchName: string,
): Promise<{
    branch: string;
    worktreePath: string;
    baseSha: string;
}> {
    const takenBranches = await listLocalBranches(repoPath);
    for (const session of sessions.values()) {
        takenBranches.add(session.branch);
    }

    const worktreesRoot = getRepositoryWorktreesDir(projectName);
    const takenLeaves = await listWorktreeLeaves(worktreesRoot);
    for (const session of sessions.values()) {
        if (session.repositoryId === projectName) {
            takenLeaves.add(path.basename(session.worktreePath));
        }
    }

    const leaf = uniqueSlug(slugify(sessionName) || 'session', takenLeaves);
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
    repositoryId: string;
    name: string;
    agent: AgentId;
    branch: string;
    yoloMode?: boolean;
}): Promise<Session> {
    const name = input.name.trim();
    if (!name) {
        throw new Error('Name is required');
    }
    const branch = input.branch.trim();
    if (!branch) {
        throw new Error('Branch is required');
    }

    const repository = await getRepository(input.repositoryId);
    if (!repository) {
        throw new Error('Repository not found');
    }

    const id = randomUUID();
    let worktree: { branch: string; worktreePath: string; baseSha: string };
    try {
        worktree = await createWorktree(repository.id, repository.path, name, branch);
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to create worktree';
        throw new Error(
            message.startsWith('Failed to create worktree') ? message : `Failed to create worktree: ${message}`,
        );
    }

    const session: RuntimeSession = {
        id,
        name,
        agent: input.agent,
        repositoryId: repository.id,
        branch: worktree.branch,
        status: 'busy',
        createdAt: Date.now(),
        yoloMode: Boolean(input.yoloMode),
        worktreePath: worktree.worktreePath,
        baseSha: worktree.baseSha,
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
    if (!session) return null;
    return getSessionDiffSummary(session.worktreePath, session.baseSha);
}

export async function getSessionDiffFile(id: string, filePath: string): Promise<SessionFileDiff | null> {
    const session = sessions.get(id);
    if (!session) return null;
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

    if (repository) {
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
