import type { HubClient } from '@core/libs/hubClient.js';
import { getHomeDir, resolveAbsoluteUserPath } from '@core/libs/paths.js';
import { extractOscTitle, type OscTitleParseState } from '@core/libs/sessions/agentStatus.js';
import {
    appendShellOutput,
    attachShellClient,
    clearShell,
    parseClientMessage,
    setShellTitle,
} from '@core/libs/sessions/terminalHub.js';
import { resolveUserShell } from '@core/libs/sessions/userShell.js';
import { getSettings } from '@core/libs/settings/store.js';
import { access } from 'node:fs/promises';
import path from 'node:path';
import type { IPty } from 'node-pty';
import * as pty from 'node-pty';

/** Hub key so workspace shells share scrollback helpers without a session. */
const WORKSPACE_SHELL_SCOPE = '__workspace__';

/** Keep in sync with `isValidShellId` in sessions/store.ts */
const SHELL_ID_RE = /^[a-zA-Z0-9_-]{1,64}$/;

export const MAX_WORKSPACE_SHELLS = 16;

function isValidShellId(shellId: string): boolean {
    return SHELL_ID_RE.test(shellId);
}

type WorkspaceShellInstance = {
    id: string;
    pty: IPty;
    title: string;
    oscTitleState: OscTitleParseState;
};

const shells = new Map<string, WorkspaceShellInstance>();

function defaultShellTitle(): string {
    return path.basename(resolveUserShell().file) || 'Terminal';
}

function killShellPty(term: IPty): void {
    try {
        term.kill();
    } catch {
        // ignore
    }
}

function clampPtySize(cols: number, rows: number): { cols: number; rows: number } {
    return {
        cols: Math.max(20, Math.min(300, Math.floor(cols))),
        rows: Math.max(5, Math.min(120, Math.floor(rows))),
    };
}

async function resolveWorkspaceCwd(): Promise<string> {
    const { devDir } = await getSettings();
    const trimmed = devDir.trim();
    let cwd = getHomeDir();
    if (trimmed) {
        try {
            cwd = resolveAbsoluteUserPath(trimmed);
        } catch {
            cwd = getHomeDir();
        }
    }

    try {
        await access(cwd);
        return cwd;
    } catch {
        return getHomeDir();
    }
}

/**
 * Spawn a workspace shell for `shellId` if missing.
 * Cwd is the configured workspace directory (`settings.devDir`).
 */
async function spawnWorkspaceShell(shellId: string): Promise<boolean> {
    if (!isValidShellId(shellId)) {
        return false;
    }

    if (shells.has(shellId)) {
        return true;
    }

    if (shells.size >= MAX_WORKSPACE_SHELLS) {
        return false;
    }

    const shell = resolveUserShell();
    const title = defaultShellTitle();
    const cwd = await resolveWorkspaceCwd();

    try {
        const term = pty.spawn(shell.file, shell.args, {
            name: 'xterm-256color',
            cols: 80,
            rows: 24,
            cwd,
            env: process.env as Record<string, string>,
        });
        const instance: WorkspaceShellInstance = {
            id: shellId,
            pty: term,
            title,
            oscTitleState: { pending: '' },
        };
        shells.set(shellId, instance);
        setShellTitle(WORKSPACE_SHELL_SCOPE, shellId, title);

        term.onData((data) => {
            appendShellOutput(WORKSPACE_SHELL_SCOPE, shellId, data);
            const oscTitle = extractOscTitle(data, instance.oscTitleState);
            if (oscTitle && oscTitle !== instance.title) {
                instance.title = oscTitle;
                setShellTitle(WORKSPACE_SHELL_SCOPE, shellId, oscTitle);
            }
        });

        term.onExit(() => {
            const current = shells.get(shellId);
            if (!current || current.pty !== term) return;
            shells.delete(shellId);
            appendShellOutput(WORKSPACE_SHELL_SCOPE, shellId, '\r\n[shell exited]\r\n');
        });
        return true;
    } catch (err: unknown) {
        shells.delete(shellId);
        const message = err instanceof Error ? err.message : 'Failed to start shell';
        appendShellOutput(WORKSPACE_SHELL_SCOPE, shellId, `\r\n[failed to start shell: ${message}]\r\n`);
        return false;
    }
}

/** Kill one workspace shell, or all when `shellId` is omitted. */
export function killWorkspaceShell(shellId?: string): boolean {
    if (shellId !== undefined) {
        if (!isValidShellId(shellId)) {
            return false;
        }
        const instance = shells.get(shellId);
        shells.delete(shellId);
        clearShell(WORKSPACE_SHELL_SCOPE, shellId);
        if (instance) {
            killShellPty(instance.pty);
        }
        return true;
    }

    const instances = [...shells.values()];
    shells.clear();
    for (const instance of instances) {
        clearShell(WORKSPACE_SHELL_SCOPE, instance.id);
        killShellPty(instance.pty);
    }
    return true;
}

export function hasWorkspaceShell(shellId: string): boolean {
    return isValidShellId(shellId);
}

/** Attach a client to a workspace shell. Spawns that shell on first connect. */
export async function attachWorkspaceShell(shellId: string, socket: HubClient): Promise<boolean> {
    if (!isValidShellId(shellId)) {
        return false;
    }

    if (!(await spawnWorkspaceShell(shellId))) {
        return false;
    }

    attachShellClient(WORKSPACE_SHELL_SCOPE, shellId, socket);

    socket.on('message', (raw) => {
        void (async () => {
            const text = typeof raw === 'string' ? raw : (raw as { toString(): string }).toString();
            const message = parseClientMessage(text);
            if (!message) return;

            let instance = shells.get(shellId);
            if (!instance) {
                if (!(await spawnWorkspaceShell(shellId))) return;
                instance = shells.get(shellId);
            }
            if (!instance) return;

            if (message.type === 'input') {
                instance.pty.write(message.data);
                return;
            }

            if (message.type === 'resize') {
                const { cols, rows } = clampPtySize(message.cols, message.rows);
                try {
                    instance.pty.resize(cols, rows);
                } catch {
                    // ignore resize errors on exited pty
                }
            }
        })();
    });

    return true;
}
