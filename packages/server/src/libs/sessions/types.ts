import type { AgentId } from '@server/libs/agents/agents.js';

export type SessionStatus = 'ready' | 'busy' | 'error';

export type SessionType = 'coding' | 'conversation';

export type Session = {
    id: string;
    name: string;
    /** Settings profile used to create this session. */
    profileId: string;
    agent: AgentId;
    type: SessionType;
    repositoryId: string | null;
    branch: string | null;
    /** Commits the session branch is behind the remote default; null when N/A. */
    behindDefault: number | null;
    status: SessionStatus;
    createdAt: number;
};

/** Durable fields written to `~/.tether/sessions.json`. */
export type StoredSession = {
    id: string;
    name: string;
    profileId: string;
    agent: AgentId;
    type: SessionType;
    repositoryId: string | null;
    branch: string | null;
    status: SessionStatus;
    createdAt: number;
    yoloMode: boolean;
    useWorktrees: boolean;
    createdBranch: boolean;
    worktreePath: string;
    baseSha: string;
    hadLocalCommits: boolean;
    /** Agent-native chat/conversation id for resume (Cursor/Claude/etc.). */
    agentSessionId: string | null;
};
