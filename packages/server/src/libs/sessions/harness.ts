import { getAgentCommandCandidates, type AgentId } from '@server/libs/agents/agents.js';
import { getHomeDir } from '@server/libs/paths.js';
import { findCommandOnPath, resolvePtyLaunch, type PtyLaunch } from '@server/libs/process/resolveCommand.js';
import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export type HarnessCommand = {
    command: string;
    args: string[];
};

export type HarnessOptions = {
    yoloMode?: boolean;
    /** Agent-native chat/conversation id used to resume after restarts. */
    agentSessionId?: string | null;
    /** When true, attach to an existing agent session instead of creating one. */
    resume?: boolean;
};

/** Logical CLI name + argv for an agent (before PATH / Windows resolution). */
export function getHarnessCommand(agent: AgentId, options: HarnessOptions = {}): HarnessCommand {
    const command = getAgentCommandCandidates(agent)[0] ?? agent;
    const sessionId = options.agentSessionId?.trim() || null;
    const resume = Boolean(options.resume && sessionId);

    switch (agent) {
        case 'cursor': {
            // Always trust the session workspace so the interactive trust prompt never blocks a phone session.
            const args = ['--trust'];
            if (sessionId) {
                // Prefer = form so a bare --resume never opens the interactive picker.
                args.push(`--resume=${sessionId}`);
            }
            if (options.yoloMode) {
                args.push('--yolo');
            }
            return { command, args };
        }
        case 'claude': {
            const args: string[] = [];
            if (resume && sessionId) {
                args.push('--resume', sessionId);
            } else if (sessionId) {
                args.push('--session-id', sessionId);
            }
            if (options.yoloMode) {
                args.push('--dangerously-skip-permissions');
            }
            return { command, args };
        }
        case 'codex': {
            if (resume && sessionId) {
                const args = ['resume', sessionId];
                if (options.yoloMode) {
                    args.push('--ask-for-approval', 'never');
                }
                return { command, args };
            }
            const args: string[] = [];
            if (options.yoloMode) {
                args.push('--ask-for-approval', 'never');
            }
            return { command, args };
        }
        case 'opencode': {
            const args: string[] = [];
            if (resume && sessionId) {
                args.push('--session', sessionId);
            }
            if (options.yoloMode) {
                args.push('--auto');
            }
            return { command, args };
        }
    }
}

/**
 * Allocate an agent-native session id when the CLI supports a known id up front.
 * Returns null when the agent only assigns ids after start (Codex / OpenCode).
 */
export async function createAgentSessionId(agent: AgentId): Promise<string | null> {
    switch (agent) {
        case 'cursor': {
            const candidates = getAgentCommandCandidates(agent);
            for (const candidate of candidates) {
                if (!(await findCommandOnPath(candidate))) {
                    continue;
                }
                try {
                    const { stdout } = await execFileAsync(candidate, ['create-chat'], {
                        encoding: 'utf8',
                        timeout: 30_000,
                    });
                    const id = stdout.trim().split(/\s+/)[0] ?? '';
                    if (id) {
                        return id;
                    }
                } catch (err: unknown) {
                    console.error(`Failed to create Cursor chat via ${candidate}`, err);
                }
            }
            return null;
        }
        case 'claude':
            return randomUUID();
        case 'codex':
        case 'opencode':
            return null;
    }
}

/**
 * Resolve the first available agent CLI on PATH into a node-pty launch descriptor.
 * Handles Windows PATHEXT / npm `.cmd` shims and `agent` vs `cursor-agent` aliases.
 */
export async function resolveHarnessLaunch(
    agent: AgentId,
    options: HarnessOptions = {},
): Promise<PtyLaunch & { displayCommand: string; displayArgs: string[] }> {
    const { args } = getHarnessCommand(agent, options);
    const candidates = getAgentCommandCandidates(agent);

    for (const candidate of candidates) {
        if (!(await findCommandOnPath(candidate))) {
            continue;
        }
        const launch = await resolvePtyLaunch(candidate, args);
        return { ...launch, displayCommand: candidate, displayArgs: args };
    }

    // Fall back to the primary name so the spawn error still names something useful.
    const fallback = candidates[0] ?? agent;
    const launch = await resolvePtyLaunch(fallback, args);
    return { ...launch, displayCommand: fallback, displayArgs: args };
}

/**
 * Pre-accept workspace trust for harnesses that prompt on first open of a directory.
 * Cursor uses `--trust` in getHarnessCommand; Claude/Codex store trust in user config.
 * OpenCode has no workspace-trust prompt.
 */
export async function ensureWorkspaceTrusted(agent: AgentId, workspacePath: string): Promise<void> {
    const resolved = path.resolve(workspacePath);
    try {
        switch (agent) {
            case 'cursor':
            case 'opencode':
                return;
            case 'claude':
                await ensureClaudeWorkspaceTrusted(resolved);
                return;
            case 'codex':
                await ensureCodexWorkspaceTrusted(resolved);
                return;
        }
    } catch (err: unknown) {
        console.error(`Failed to pre-trust workspace for ${agent}`, err);
    }
}

async function ensureClaudeWorkspaceTrusted(workspacePath: string): Promise<void> {
    const configPath = path.join(getHomeDir(), '.claude.json');
    let config: { projects?: Record<string, Record<string, unknown>>; [key: string]: unknown } = {};

    try {
        const raw = await readFile(configPath, 'utf8');
        config = JSON.parse(raw) as typeof config;
    } catch (err: unknown) {
        if ((err as NodeJS.ErrnoException)?.code !== 'ENOENT') {
            throw err;
        }
    }

    const projects = { ...(config.projects ?? {}) };
    const existing = projects[workspacePath] ?? {};
    if (existing.hasTrustDialogAccepted === true) {
        return;
    }

    projects[workspacePath] = { ...existing, hasTrustDialogAccepted: true };
    config.projects = projects;
    await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
}

async function ensureCodexWorkspaceTrusted(workspacePath: string): Promise<void> {
    const codexHome = process.env.CODEX_HOME?.trim() || path.join(getHomeDir(), '.codex');
    const configPath = path.join(codexHome, 'config.toml');

    let raw = '';
    try {
        raw = await readFile(configPath, 'utf8');
    } catch (err: unknown) {
        if ((err as NodeJS.ErrnoException)?.code !== 'ENOENT') {
            throw err;
        }
    }

    const next = upsertCodexProjectTrust(raw, workspacePath);
    if (next === raw) {
        return;
    }
    await writeFile(configPath, next, 'utf8');
}

/** Escape a path for use as a TOML basic-string table key. */
function tomlBasicString(value: string): string {
    return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

/**
 * Ensure `[projects."<path>"]` / `trust_level = "trusted"` exists in Codex config.toml.
 * Codex has no `--trust` CLI flag; trust is only persisted via this config key.
 */
function upsertCodexProjectTrust(config: string, workspacePath: string): string {
    const header = `[projects.${tomlBasicString(workspacePath)}]`;
    const trustLine = 'trust_level = "trusted"';
    const normalized = config.replace(/\r\n/g, '\n');
    const headerIndex = normalized.indexOf(header);

    if (headerIndex === -1) {
        const trimmed = normalized.replace(/\s+$/, '');
        const prefix = trimmed.length > 0 ? `${trimmed}\n\n` : '';
        return `${prefix}${header}\n${trustLine}\n`;
    }

    const bodyStart = headerIndex + header.length;
    const rest = normalized.slice(bodyStart);
    const nextHeaderMatch = rest.match(/\n\[/);
    const bodyEnd = nextHeaderMatch?.index != null ? bodyStart + nextHeaderMatch.index : normalized.length;
    const body = normalized.slice(bodyStart, bodyEnd);

    if (/^[ \t]*trust_level[ \t]*=[ \t]*"trusted"[ \t]*$/m.test(body)) {
        return normalized.endsWith('\n') || normalized.length === 0 ? normalized : `${normalized}\n`;
    }

    let nextBody: string;
    if (/^[ \t]*trust_level[ \t]*=/m.test(body)) {
        nextBody = body.replace(/^[ \t]*trust_level[ \t]*=.*$/m, trustLine);
    } else {
        const bodyWithoutLeadingNewlines = body.replace(/^\n*/, '');
        nextBody = `\n${trustLine}\n${bodyWithoutLeadingNewlines}`;
        if (!nextBody.endsWith('\n')) {
            nextBody = `${nextBody}\n`;
        }
    }

    return `${normalized.slice(0, headerIndex)}${header}${nextBody}${normalized.slice(bodyEnd)}`;
}
