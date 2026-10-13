export { createHost, type TetherHost } from './createHost.js';
export type { HubClient } from './libs/hubClient.js';

export { resolveAbsoluteUserPath } from './libs/paths.js';

export { isAgentId, listAvailableAgents, type AgentId, type AgentInfo } from './libs/agents/agents.js';

export {
    errors,
    formatCriticalError,
    formatErrorMessage,
    type CriticalError,
    type CriticalErrorDefinition,
    type CriticalErrorKey,
    type CriticalErrorValues,
} from './libs/errors.js';

export { logger, sanitizeUrl } from './libs/logger.js';

export type { AvailableRepository, Repository } from './libs/repositories/store.js';

export type { Session, SessionStatus, SessionType, StoredSession } from './libs/sessions/types.js';

export type { ClientTerminalMessage, ServerShellMessage, ServerTerminalMessage } from './libs/sessions/terminalHub.js';

export type { ServerSessionEventMessage } from './libs/sessions/statusHub.js';

export type { DiffFileStatus, SessionDiffFile, SessionDiffSummary, SessionFileDiff } from './libs/sessions/diff.js';

export { isValidShellId, MAX_SESSION_SHELLS, type SessionDiffResult } from './libs/sessions/store.js';

export { MAX_WORKSPACE_SHELLS } from './libs/workspace-shells/store.js';

export { BRANCH_IN_USE_BY_WORKTREE_ERROR } from './libs/sessions/worktreeBranch.js';

export { DEFAULT_KEYBINDS, isKeybinds, normalizeKeybinds, type Keybinds } from './libs/settings/keybinds.js';

export {
    MAX_TOAST_DURATION_SECONDS,
    MIN_TOAST_DURATION_SECONDS,
    normalizeToastDurationSeconds,
    normalizeWorktreesDir,
    type Settings,
    type StoredRepository,
} from './libs/settings/store.js';
