import type { AgentId } from '@server/libs/agents/agents.js';
import { getHomeDir } from '@server/libs/paths.js';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export type HarnessCommand = {
    command: string;
    args: string[];
};

export type HarnessOptions = {
    yoloMode?: boolean;
};

export function getHarnessCommand(agent: AgentId, options: HarnessOptions = {}): HarnessCommand {
    switch (agent) {
        case 'cursor': {
            // Always trust the session workspace so the interactive trust prompt never blocks a phone session.
            const args = ['--trust'];
            if (options.yoloMode) {
                args.push('--yolo');
            }
            return { command: 'agent', args };
        }
        case 'claude': {
            const args: string[] = [];
            if (options.yoloMode) {
                args.push('--dangerously-skip-permissions');
            }
            return { command: 'claude', args };
        }
        case 'codex': {
            const args: string[] = [];
            if (options.yoloMode) {
                args.push('--ask-for-approval', 'never');
            }
            return { command: 'codex', args };
        }
        case 'opencode': {
            const args: string[] = [];
            if (options.yoloMode) {
                args.push('--auto');
            }
            return { command: 'opencode', args };
        }
    }
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
