import { messages } from './agents.messages';

export const AGENTS = [{ id: 'cursor', labelMessage: messages.cursor }] as const;

export type AgentId = (typeof AGENTS)[number]['id'];

export function isAgentId(value: string): value is AgentId {
    return AGENTS.some((agent) => agent.id === value);
}
