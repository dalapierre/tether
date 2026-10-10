import { isCommandOnPath } from '@core/libs/process/resolveCommand.js';

export type AgentId = 'cursor' | 'claude' | 'codex' | 'opencode' | 'rovo';

export type AgentInfo = {
    id: AgentId;
    label: string;
};

type AgentDefinition = AgentInfo & {
    /** CLI binaries to look for on PATH (first match wins for availability and spawn). */
    commands: string[];
};

export const SUPPORTED_AGENTS: AgentDefinition[] = [
    { id: 'cursor', label: 'Cursor', commands: ['agent', 'cursor-agent'] },
    { id: 'claude', label: 'Claude Code', commands: ['claude'] },
    { id: 'codex', label: 'Codex', commands: ['codex'] },
    { id: 'opencode', label: 'OpenCode', commands: ['opencode'] },
    // Prefer the standalone `rovo` binary; fall back to legacy `acli rovodev`.
    { id: 'rovo', label: 'Rovo', commands: ['rovo', 'acli'] },
];

const AGENT_IDS = new Set<string>(SUPPORTED_AGENTS.map((agent) => agent.id));

export function isAgentId(value: unknown): value is AgentId {
    return typeof value === 'string' && AGENT_IDS.has(value);
}

export function getAgentCommandCandidates(agent: AgentId): string[] {
    const definition = SUPPORTED_AGENTS.find((entry) => entry.id === agent);
    return definition?.commands ?? [];
}

/** Returns CLI harnesses that are installed and available on this machine. */
export async function listAvailableAgents(): Promise<AgentInfo[]> {
    const available: AgentInfo[] = [];

    for (const agent of SUPPORTED_AGENTS) {
        let found = false;
        for (const command of agent.commands) {
            if (await isCommandOnPath(command)) {
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
