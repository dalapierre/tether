export type AgentId = 'cursor';

export type AgentInfo = {
    id: AgentId;
    label: string;
};

export const SUPPORTED_AGENTS: AgentInfo[] = [{ id: 'cursor', label: 'Cursor' }];

export function isAgentId(value: unknown): value is AgentId {
    return value === 'cursor';
}
