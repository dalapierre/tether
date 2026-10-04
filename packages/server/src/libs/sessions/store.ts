import type { AgentId } from '@server/libs/agents/agents.js';
import { getRepository } from '@server/libs/repositories/store.js';
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
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import type { IPty } from 'node-pty';
import * as pty from 'node-pty';
import type { WebSocket } from 'ws';

const execFileAsync = promisify(execFile);

const IDLE_READY_MS = 1500;
const WORKTREE_PREFIX = 'tether-worktrees';

type RuntimeSession = Session & {
    worktreePath: string;
    pty: IPty | null;
    idleTimer: ReturnType<typeof setTimeout> | null;
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

function markBusy(session: RuntimeSession): void {
    if (session.status === 'error') return;
    setStatus(session, 'busy');
    if (session.idleTimer) {
        clearTimeout(session.idleTimer);
    }
    session.idleTimer = setTimeout(() => {
        if (session.status === 'busy' && session.pty) {
            setStatus(session, 'ready');
        }
    }, IDLE_READY_MS);
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

async function createWorktree(
    repoPath: string,
    sessionName: string,
): Promise<{
    branch: string;
    worktreePath: string;
}> {
    const takenBranches = await listLocalBranches(repoPath);
    for (const session of sessions.values()) {
        takenBranches.add(session.branch);
    }

    const prefix = `${WORKTREE_PREFIX}/`;
    const takenLeaves = new Set(
        [...takenBranches].map((branch) => (branch.startsWith(prefix) ? branch.slice(prefix.length) : branch)),
    );
    const leaf = uniqueSlug(slugify(sessionName) || 'session', takenLeaves);
    const branch = `${WORKTREE_PREFIX}/${leaf}`;

    const worktreesRoot = path.resolve(repoPath, '..', WORKTREE_PREFIX);
    const worktreePath = path.join(worktreesRoot, leaf);
    await mkdir(worktreesRoot, { recursive: true });
    await execFileAsync('git', ['worktree', 'add', '-b', branch, worktreePath], { cwd: repoPath });
    return { branch, worktreePath };
}

function spawnHarness(session: RuntimeSession): void {
    const harness = getHarnessCommand(session.agent);
    try {
        const term = pty.spawn(harness.command, harness.args, {
            name: 'xterm-256color',
            cols: 80,
            rows: 24,
            cwd: session.worktreePath,
            env: process.env as Record<string, string>,
        });
        session.pty = term;
        markBusy(session);

        term.onData((data) => {
            appendOutput(session.id, data);
            markBusy(session);
        });

        term.onExit(() => {
            session.pty = null;
            if (session.idleTimer) {
                clearTimeout(session.idleTimer);
                session.idleTimer = null;
            }
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

export async function createSession(input: { repositoryId: string; name: string; agent: AgentId }): Promise<Session> {
    const name = input.name.trim();
    if (!name) {
        throw new Error('Name is required');
    }

    const repository = await getRepository(input.repositoryId);
    if (!repository) {
        throw new Error('Repository not found');
    }

    const id = randomUUID();
    let worktree: { branch: string; worktreePath: string };
    try {
        worktree = await createWorktree(repository.path, name);
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to create worktree';
        throw new Error(`Failed to create worktree: ${message}`);
    }

    const session: RuntimeSession = {
        id,
        name,
        agent: input.agent,
        repositoryId: repository.id,
        branch: worktree.branch,
        status: 'busy',
        createdAt: Date.now(),
        worktreePath: worktree.worktreePath,
        pty: null,
        idleTimer: null,
    };

    sessions.set(id, session);

    try {
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
            markBusy(session);
            return;
        }

        if (message.type === 'input') {
            session.pty.write(message.data);
            markBusy(session);
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

    if (session.idleTimer) {
        clearTimeout(session.idleTimer);
        session.idleTimer = null;
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
