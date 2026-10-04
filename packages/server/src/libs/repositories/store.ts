import {
    getSettings,
    getStoredRepositories,
    setStoredRepositories,
    type StoredRepository,
} from '@server/libs/settings/store.js';
import { randomUUID } from 'node:crypto';
import { access, readFile, readdir, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export type Repository = StoredRepository;

export type AvailableRepository = {
    name: string;
    path: string;
};

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const legacyDataFile = path.join(packageRoot, 'data', 'repositories.json');

let legacyMigrated = false;

function isRepository(value: unknown): value is Repository {
    return (
        !!value &&
        typeof value === 'object' &&
        typeof (value as Repository).id === 'string' &&
        typeof (value as Repository).name === 'string' &&
        typeof (value as Repository).path === 'string'
    );
}

/** One-time migration from the old standalone repositories.json into settings. */
async function migrateLegacyRepositories(): Promise<void> {
    if (legacyMigrated) {
        return;
    }
    legacyMigrated = true;

    let raw: string;
    try {
        raw = await readFile(legacyDataFile, 'utf8');
    } catch (err: unknown) {
        if (err && typeof err === 'object' && 'code' in err && err.code === 'ENOENT') {
            return;
        }
        throw err;
    }

    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch {
        await unlink(legacyDataFile).catch(() => undefined);
        return;
    }

    const legacy = Array.isArray(parsed) ? parsed.filter(isRepository) : [];
    if (legacy.length > 0) {
        const current = await getStoredRepositories();
        if (current.length === 0) {
            await setStoredRepositories(legacy);
        }
    }

    await unlink(legacyDataFile).catch(() => undefined);
}

async function readAll(): Promise<Repository[]> {
    await migrateLegacyRepositories();
    return getStoredRepositories();
}

async function writeAll(repositories: Repository[]): Promise<void> {
    await setStoredRepositories(repositories);
}

async function isGitRepository(dirPath: string): Promise<boolean> {
    try {
        await access(path.join(dirPath, '.git'));
        return true;
    } catch {
        return false;
    }
}

export async function listRepositories(): Promise<Repository[]> {
    const repositories = await readAll();
    return [...repositories].sort((a, b) => a.name.localeCompare(b.name));
}

export async function listAvailableRepositories(): Promise<AvailableRepository[]> {
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

    const added = await readAll();
    const addedPaths = new Set(added.map((repository) => path.resolve(repository.path)));

    const available: AvailableRepository[] = [];
    for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const repoPath = path.resolve(path.join(trimmed, entry.name));
        if (addedPaths.has(repoPath)) continue;
        if (!(await isGitRepository(repoPath))) continue;
        available.push({ name: entry.name, path: repoPath });
    }

    available.sort((a, b) => a.name.localeCompare(b.name));
    return available;
}

export async function addRepository(repoPath: string): Promise<Repository> {
    const resolved = path.resolve(repoPath.trim());
    if (!resolved) {
        throw new Error('Repository path is required');
    }

    const { devDir } = await getSettings();
    const trimmedDevDir = path.resolve(devDir.trim());
    if (!devDir.trim()) {
        throw new Error('Development directory is not set');
    }

    if (resolved !== trimmedDevDir && !resolved.startsWith(`${trimmedDevDir}${path.sep}`)) {
        throw new Error('Repository must be inside the development directory');
    }

    if (!(await isGitRepository(resolved))) {
        throw new Error('Path is not a git repository');
    }

    const repositories = await readAll();
    if (repositories.some((repository) => path.resolve(repository.path) === resolved)) {
        throw new Error('Repository is already added');
    }

    const repository: Repository = {
        id: randomUUID(),
        name: path.basename(resolved),
        path: resolved,
    };
    repositories.push(repository);
    await writeAll(repositories);
    return repository;
}
