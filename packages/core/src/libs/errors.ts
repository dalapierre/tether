/** Catalogue entry for a backend error. Message may use `{placeholder}` vars. */
export type CriticalErrorDefinition = {
    id: string;
    message: string;
};

/** Formatted error ready to log or hand to future incident tooling. */
export type CriticalError = {
    id: string;
    message: string;
    err: string;
};

export type CriticalErrorValues = Record<string, string | number>;

/**
 * Backend errors logged via `logger.error`.
 * Prefer scoped ids: `area.component.failure-type` (kebab-case segments).
 * When adding a new `logger.error` call site, add an entry here first.
 */
export const errors = {
    hostStartupFailure: {
        id: 'host.startup.failure',
        message: 'Host failed to start',
    },
    httpRequestServerError: {
        id: 'http.request.server-error',
        message: '{method} {url} → {statusCode} ({durationMs}ms)',
    },
    sessionsRestoreFailure: {
        id: 'sessions.restore.failure',
        message: 'Failed to restore sessions',
    },
    sessionsPersistParseFailure: {
        id: 'sessions.persist.parse-failure',
        message: 'Failed to parse sessions.json — starting with an empty session list',
    },
    sessionsListFailure: {
        id: 'sessions.list.failure',
        message: 'Failed to list sessions',
    },
    sessionsGetFailure: {
        id: 'sessions.get.failure',
        message: 'Failed to get session',
    },
    sessionsCreateFailure: {
        id: 'sessions.create.failure',
        message: 'Failed to create session',
    },
    sessionsRestartFailure: {
        id: 'sessions.restart.failure',
        message: 'Failed to restart session',
    },
    sessionsDiffLoadFailure: {
        id: 'sessions.diff.load-failure',
        message: 'Failed to load session diff',
    },
    sessionsDiffFileLoadFailure: {
        id: 'sessions.diff.file-load-failure',
        message: 'Failed to load session file diff',
    },
    sessionsDiffDiscardFailure: {
        id: 'sessions.diff.discard-failure',
        message: 'Failed to discard session file change',
    },
    sessionPersistBranchFailure: {
        id: 'session.persist.branch-failure',
        message: 'Failed to persist branch for session {sessionId}',
    },
    sessionPersistStatusFailure: {
        id: 'session.persist.status-failure',
        message: 'Failed to persist status for session {sessionId}',
    },
    sessionPersistReviewBaseFailure: {
        id: 'session.persist.review-base-failure',
        message: 'Failed to persist review base for session {sessionId}',
    },
    sessionPersistDeleteFailure: {
        id: 'session.persist.delete-failure',
        message: 'Failed to persist sessions after deleting {sessionId}',
    },
    sessionInitFailure: {
        id: 'session.init.failure',
        message: 'Failed to initialize session {sessionId}',
    },
    sessionRestoreFailure: {
        id: 'session.restore.failure',
        message: 'Failed to restore session {sessionId}',
    },
    sessionWorktreeRemoveFailure: {
        id: 'session.worktree.remove-failure',
        message: 'Failed to remove worktree for session {sessionId}',
    },
    sessionDiffRefreshFailure: {
        id: 'session.diff.refresh-failure',
        message: 'Failed to refresh session diff for {sessionId}',
    },
    sessionRemoteBehindRefreshFailure: {
        id: 'session.remote.behind-refresh-failure',
        message: 'Failed to refresh remote behind count for session {sessionId}',
    },
    sessionWorkspaceWatchFailure: {
        id: 'session.watch.workspace-failure',
        message: 'Failed to watch workspace for session {sessionId}',
    },
    sessionHeadWatchFailure: {
        id: 'session.watch.head-failure',
        message: 'Failed to watch HEAD for session {sessionId}',
    },
    sessionReviewBaseSyncFailure: {
        id: 'session.review-base.sync-failure',
        message: 'Failed to sync review base for session {sessionId}',
    },
    sessionUsageSampleFailure: {
        id: 'session.usage.sample-failure',
        message: 'Failed to sample session resource usage',
    },
    sessionEventsSnapshotFailure: {
        id: 'session.events.snapshot-failure',
        message: 'Failed to send session events snapshot',
    },
    sessionCursorStatusIndicatorsFailure: {
        id: 'session.cursor.status-indicators-failure',
        message: 'Failed to enable Cursor status indicators',
    },
    sessionHarnessCursorChatFailure: {
        id: 'session.harness.cursor-chat-failure',
        message: 'Failed to create Cursor chat via {candidate}',
    },
    sessionHarnessPreTrustFailure: {
        id: 'session.harness.pre-trust-failure',
        message: 'Failed to pre-trust workspace for {agent}',
    },
    workspaceHarnessSpawnFailure: {
        id: 'workspace.harness.spawn-failure',
        message: 'Failed to run default harness CLI in workspace shell {shellId}',
    },
    settingsLoadFailure: {
        id: 'settings.load.failure',
        message: 'Failed to load settings',
    },
    settingsSaveFailure: {
        id: 'settings.save.failure',
        message: 'Failed to save settings',
    },
    quickPromptsListFailure: {
        id: 'quick-prompts.list.failure',
        message: 'Failed to list quick prompts',
    },
    quickPromptsCreateFailure: {
        id: 'quick-prompts.create.failure',
        message: 'Failed to create quick prompt',
    },
    quickPromptsGetFailure: {
        id: 'quick-prompts.get.failure',
        message: 'Failed to get quick prompt',
    },
    quickPromptsUpdateFailure: {
        id: 'quick-prompts.update.failure',
        message: 'Failed to update quick prompt',
    },
    quickPromptsDeleteFailure: {
        id: 'quick-prompts.delete.failure',
        message: 'Failed to delete quick prompt',
    },
    repositoriesListFailure: {
        id: 'repositories.list.failure',
        message: 'Failed to list repositories',
    },
    repositoriesListAvailableFailure: {
        id: 'repositories.list.available-failure',
        message: 'Failed to list available repositories',
    },
    repositoriesBranchesListFailure: {
        id: 'repositories.branches.list-failure',
        message: 'Failed to list repository branches',
    },
    repositoriesDirectoriesListFailure: {
        id: 'repositories.directories.list-failure',
        message: 'Failed to list repository directories',
    },
    repositoriesAddFailure: {
        id: 'repositories.add.failure',
        message: 'Failed to add repository',
    },
    repositoriesRemoveFailure: {
        id: 'repositories.remove.failure',
        message: 'Failed to remove repository',
    },
    agentsListFailure: {
        id: 'agents.list.failure',
        message: 'Failed to list available agents',
    },
} as const satisfies Record<string, CriticalErrorDefinition>;

export type CriticalErrorKey = keyof typeof errors;

function stringifyErr(err: unknown): string {
    if (err === undefined || err === null) {
        return '';
    }
    if (err instanceof Error) {
        return err.stack ?? `${err.name}: ${err.message}`;
    }
    return String(err);
}

/** True when the value is a placeholder map for message formatting (not an Error). */
export function isCriticalErrorValues(value: unknown): value is CriticalErrorValues {
    return typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Error);
}

/** Replace `{name}` placeholders in an error message template. */
export function formatErrorMessage(template: string, values?: CriticalErrorValues): string {
    if (!values) {
        return template;
    }
    return template.replace(/\{(\w+)\}/g, (match, key: string) => {
        if (Object.prototype.hasOwnProperty.call(values, key)) {
            return String(values[key]);
        }
        return match;
    });
}

export function formatCriticalError(
    definition: CriticalErrorDefinition,
    values?: CriticalErrorValues,
    err?: unknown,
): CriticalError;
export function formatCriticalError(definition: CriticalErrorDefinition, err?: unknown): CriticalError;
export function formatCriticalError(
    definition: CriticalErrorDefinition,
    valuesOrErr?: CriticalErrorValues | unknown,
    err?: unknown,
): CriticalError {
    const hasValues = isCriticalErrorValues(valuesOrErr);
    const values = hasValues ? valuesOrErr : undefined;
    const error = hasValues ? err : valuesOrErr;

    return {
        id: definition.id,
        message: formatErrorMessage(definition.message, values),
        err: stringifyErr(error),
    };
}
