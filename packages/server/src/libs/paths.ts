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

export function getWorktreesDir(): string {
    return path.join(getTetherHomeDir(), 'worktrees');
}

/** Directory for a project's session worktrees: `~/.tether/worktrees/<project-name>`. */
export function getRepositoryWorktreesDir(projectName: string): string {
    return path.join(getWorktreesDir(), projectName);
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
