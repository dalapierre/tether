import { getSettings } from '@server/libs/settings/store.js';
import { access, readdir } from 'node:fs/promises';
import path from 'node:path';

export type Repository = {
    id: string;
    name: string;
};

async function isGitRepository(dirPath: string): Promise<boolean> {
    try {
        await access(path.join(dirPath, '.git'));
        return true;
    } catch {
        return false;
    }
}

export async function listRepositories(): Promise<Repository[]> {
    const { devDir } = await getSettings();
    const trimmed = devDir.trim();
    if (!trimmed) {
        return [];
    }

    let entries;
    try {
        entries = await readdir(trimmed, { withFileTypes: true });
    } catch (err: unknown) {
        if (err && typeof err === 'object' && 'code' in err && err.code === 'ENOENT') {
            return [];
        }
        throw err;
    }

    const repositories: Repository[] = [];
    for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const repoPath = path.join(trimmed, entry.name);
        if (!(await isGitRepository(repoPath))) continue;
        repositories.push({ id: entry.name, name: entry.name });
    }

    repositories.sort((a, b) => a.name.localeCompare(b.name));
    return repositories;
}
