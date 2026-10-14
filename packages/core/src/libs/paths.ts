import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Cross-platform user home (`os.homedir()` — HOME / USERPROFILE). */
export function getHomeDir(): string {
    return homedir();
}

/** Root directory for Tether settings and worktrees: `~/.tether`. */
export function getTetherHomeDir(): string {
    return path.join(getHomeDir(), '.tether');
}

export function getSettingsFilePath(): string {
    return path.join(getTetherHomeDir(), 'settings.json');
}

/** Persisted session metadata for restore after server restart: `~/.tether/sessions.json`. */
export function getSessionsFilePath(): string {
    return path.join(getTetherHomeDir(), 'sessions.json');
}

/** User-defined quick prompts: `~/.tether/quick-prompts.json`. */
export function getQuickPromptsFilePath(): string {
    return path.join(getTetherHomeDir(), 'quick-prompts.json');
}

export function getWorktreesDir(): string {
    return path.join(getTetherHomeDir(), 'worktrees');
}

/**
 * Expand a leading `~` and require an absolute path.
 * Throws if the value is empty, contains a null byte, or is not absolute after expansion.
 */
export function resolveAbsoluteUserPath(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) {
        throw new Error('Path is required');
    }
    if (trimmed.includes('\0')) {
        throw new Error('Invalid path');
    }
    let candidate = trimmed;
    if (candidate === '~') {
        candidate = getHomeDir();
    } else if (candidate.startsWith('~/') || candidate.startsWith('~\\')) {
        candidate = path.join(getHomeDir(), candidate.slice(2));
    }
    if (!path.isAbsolute(candidate)) {
        throw new Error('Path must be an absolute path');
    }
    return path.resolve(candidate);
}

/**
 * Directory for a project's session worktrees.
 * Defaults to `~/.tether/worktrees/<project-name>`; `worktreesRoot` replaces the
 * `~/.tether/worktrees` segment when provided (already-absolute preferred).
 */
export function getRepositoryWorktreesDir(projectName: string, worktreesRoot?: string): string {
    const root = worktreesRoot?.trim() || getWorktreesDir();
    return path.join(root, projectName);
}

/** Root directory for conversation-agent session workspaces. */
export function getConversationsDir(): string {
    return path.join(getTetherHomeDir(), 'conversations');
}

/** Working directory for a conversation session: `~/.tether/conversations/<session-id>`. */
export function getConversationSessionDir(sessionId: string): string {
    return path.join(getConversationsDir(), sessionId);
}

/** Former on-disk location under the server package (for one-time migrations). */
export function getLegacyServerDataDir(): string {
    const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
    return path.join(packageRoot, 'data');
}
