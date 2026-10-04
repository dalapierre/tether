import type { AgentId } from '@server/libs/agents/agents.js';

export type SessionStatus = 'ready' | 'busy' | 'error';

export type Session = {
    id: string;
    name: string;
    agent: AgentId;
    repositoryId: string;
    branch: string;
    status: SessionStatus;
    createdAt: number;
};
