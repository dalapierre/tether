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

/** Directory for a repository's session worktrees: `~/.tether/worktrees/<repoId>`. */
export function getRepositoryWorktreesDir(repositoryId: string): string {
    return path.join(getWorktreesDir(), repositoryId);
}

/** Former on-disk location under the server package (for one-time migrations). */
export function getLegacyServerDataDir(): string {
    const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
    return path.join(packageRoot, 'data');
}
