import { listAvailableAgents } from '@core/libs/agents/agents.js';
import { logger } from '@core/libs/logger.js';
import {
    addRepository,
    listAvailableRepositories,
    listRepositories,
    listRepositoryBranches,
    listRepositoryDirectories,
    removeRepository,
} from '@core/libs/repositories/store.js';
import {
    attachSessionEvents,
    attachSessionShell,
    attachSessionTerminal,
    createSession,
    deleteSession,
    discardSessionFileChange,
    getSession,
    getSessionDiff,
    getSessionDiffFile,
    hasSession,
    killSessionShell,
    listSessions,
    restartSession,
    restoreSessions,
} from '@core/libs/sessions/store.js';
import { getSettings, updateSettings } from '@core/libs/settings/store.js';

/**
 * Transport-agnostic Host API. Callers (HTTP/WS adapters) wrap this — core never
 * knows about Express routes or WebSocket frames.
 */
export type TetherHost = {
    getSettings: typeof getSettings;
    updateSettings: typeof updateSettings;

    listRepositories: typeof listRepositories;
    listAvailableRepositories: typeof listAvailableRepositories;
    listRepositoryBranches: typeof listRepositoryBranches;
    listRepositoryDirectories: typeof listRepositoryDirectories;
    addRepository: typeof addRepository;
    removeRepository: typeof removeRepository;

    listAvailableAgents: typeof listAvailableAgents;

    listSessions: typeof listSessions;
    getSession: typeof getSession;
    createSession: typeof createSession;
    deleteSession: typeof deleteSession;
    restartSession: typeof restartSession;
    killSessionShell: typeof killSessionShell;
    getSessionDiff: typeof getSessionDiff;
    getSessionDiffFile: typeof getSessionDiffFile;
    discardSessionFileChange: typeof discardSessionFileChange;
    hasSession: typeof hasSession;

    attachSessionTerminal: typeof attachSessionTerminal;
    attachSessionShell: typeof attachSessionShell;
    attachSessionEvents: typeof attachSessionEvents;
};

export async function createHost(): Promise<TetherHost> {
    try {
        await restoreSessions();
    } catch (err: unknown) {
        logger.error('Failed to restore sessions', err);
    }

    return {
        getSettings,
        updateSettings,

        listRepositories,
        listAvailableRepositories,
        listRepositoryBranches,
        listRepositoryDirectories,
        addRepository,
        removeRepository,

        listAvailableAgents,

        listSessions,
        getSession,
        createSession,
        deleteSession,
        restartSession,
        killSessionShell,
        getSessionDiff,
        getSessionDiffFile,
        discardSessionFileChange,
        hasSession,

        attachSessionTerminal,
        attachSessionShell,
        attachSessionEvents,
    };
}
