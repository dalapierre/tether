import { access } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import path from 'node:path';

export type AgentId = 'cursor' | 'claude' | 'codex' | 'opencode';

export type AgentInfo = {
    id: AgentId;
    label: string;
};

type AgentDefinition = AgentInfo & {
    /** CLI binaries to look for on PATH (first match wins for availability). */
    commands: string[];
};

export const SUPPORTED_AGENTS: AgentDefinition[] = [
    { id: 'cursor', label: 'Cursor', commands: ['agent', 'cursor-agent'] },
    { id: 'claude', label: 'Claude Code', commands: ['claude'] },
    { id: 'codex', label: 'Codex', commands: ['codex'] },
    { id: 'opencode', label: 'OpenCode', commands: ['opencode'] },
];

const AGENT_IDS = new Set<string>(SUPPORTED_AGENTS.map((agent) => agent.id));

export function isAgentId(value: unknown): value is AgentId {
    return typeof value === 'string' && AGENT_IDS.has(value);
}

async function isExecutableOnPath(command: string): Promise<boolean> {
    const pathEnv = process.env.PATH ?? '';
    for (const dir of pathEnv.split(path.delimiter)) {
        if (!dir) continue;
        try {
            await access(path.join(dir, command), fsConstants.X_OK);
            return true;
        } catch {
            // Keep scanning PATH.
        }
    }
    return false;
}

/** Returns CLI harnesses that are installed and available on this machine. */
export async function listAvailableAgents(): Promise<AgentInfo[]> {
    const available: AgentInfo[] = [];

    for (const agent of SUPPORTED_AGENTS) {
        let found = false;
        for (const command of agent.commands) {
            if (await isExecutableOnPath(command)) {
                found = true;
                break;
            }
        }
        if (found) {
            available.push({ id: agent.id, label: agent.label });
        }
    }

    return available;
}
