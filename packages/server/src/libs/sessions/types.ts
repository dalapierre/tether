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
    /** Remote default branch short name (e.g. main); null when N/A. */
    defaultBranch: string | null;
    /** Agent (+ shell) process tree CPU as % of all cores; null until sampled. */
    cpuPercent: number | null;
    /** Agent (+ shell) process tree RSS as % of system RAM; null until sampled. */
    ramPercent: number | null;
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
    /** True when this session created a branch at checkout; only then is that branch deleted on cleanup. */
    createdBranch: boolean;
    /**
     * Branch name created for this session (cleanup target). Distinct from `branch`, which tracks
     * the live checkout after the initial worktree/repo setup. Optional when reading older
     * sessions.json files that predate this field.
     */
    ownedBranch?: string | null;
    worktreePath: string;
    /**
     * Repo-relative working directory for the agent/shell (leading `/`, `/` = repo root).
     * Optional when reading older sessions.json files that predate this field.
     */
    workingDirectory?: string;
    /** Cached HEAD of the session checkout; review diffs are working tree vs this commit. */
    baseSha: string;
    /** Retained for sessions.json back-compat; unused for review basing. */
    hadLocalCommits: boolean;
    /** Agent-native chat/conversation id for resume (Cursor/Claude/etc.). */
    agentSessionId: string | null;
};
