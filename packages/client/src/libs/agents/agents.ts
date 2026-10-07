import { messages } from './agents.messages';

export const AGENTS = [
    { id: 'cursor', labelMessage: messages.cursor },
    { id: 'claude', labelMessage: messages.claude },
    { id: 'codex', labelMessage: messages.codex },
    { id: 'opencode', labelMessage: messages.opencode },
    { id: 'rovo', labelMessage: messages.rovo },
] as const;

export type AgentId = (typeof AGENTS)[number]['id'];

export function isAgentId(value: string): value is AgentId {
    return AGENTS.some((agent) => agent.id === value);
}

export function agentLabelMessage(id: AgentId) {
    return AGENTS.find((agent) => agent.id === id)?.labelMessage ?? messages.cursor;
}
