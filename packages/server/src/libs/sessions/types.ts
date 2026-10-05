import type { AgentId } from '@server/libs/agents/agents.js';

export type SessionStatus = 'ready' | 'busy' | 'error';

export type SessionType = 'coding' | 'conversation';

export type Session = {
    id: string;
    name: string;
    agent: AgentId;
    type: SessionType;
    repositoryId: string | null;
    branch: string | null;
    status: SessionStatus;
    createdAt: number;
};
