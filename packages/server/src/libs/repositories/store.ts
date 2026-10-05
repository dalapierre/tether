import { getLegacyServerDataDir } from '@server/libs/paths.js';
import {
    getSettings,
    getStoredRepositories,
    setStoredRepositories,
    type StoredRepository,
} from '@server/libs/settings/store.js';
import { slugify, uniqueSlug } from '@server/libs/slug/slug.js';
import { access, readFile, readdir, unlink } from 'node:fs/promises';
import path from 'node:path';

export type Repository = StoredRepository;

export type AvailableRepository = {
    name: string;
    path: string;
};

const legacyDataFile = path.join(getLegacyServerDataDir(), 'repositories.json');
const uuidIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let legacyMigrated = false;
let slugIdsMigrated = false;

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

/** One-time: replace UUID repository ids with name slugs used in project URLs. */
async function migrateSlugIds(repositories: Repository[]): Promise<Repository[]> {
    if (slugIdsMigrated) {
        return repositories;
    }
    slugIdsMigrated = true;

    if (!repositories.some((repository) => uuidIdPattern.test(repository.id))) {
        return repositories;
    }

    const taken = new Set(
        repositories.filter((repository) => !uuidIdPattern.test(repository.id)).map((repository) => repository.id),
    );

    const next = repositories.map((repository) => {
        if (!uuidIdPattern.test(repository.id)) {
            return repository;
        }
        const id = uniqueSlug(slugify(repository.name), taken);
        taken.add(id);
        return { ...repository, id };
    });

    await writeAll(next);
    return next;
}

async function readAll(): Promise<Repository[]> {
    await migrateLegacyRepositories();
    const repositories = await getStoredRepositories();
    return migrateSlugIds(repositories);
}

async function writeAll(repositories: Repository[]): Promise<void> {
    await setStoredRepositories(repositories);
}

const skipDirectoryNames = new Set(['node_modules', '.git']);

async function isGitRepository(dirPath: string): Promise<boolean> {
    try {
        await access(path.join(dirPath, '.git'));
        return true;
    } catch {
        return false;
    }
}

function shouldSkipDirectory(name: string): boolean {
    return skipDirectoryNames.has(name) || name.startsWith('.');
}

async function collectGitRepositories(
    dirPath: string,
    rootPath: string,
    addedPaths: Set<string>,
    available: AvailableRepository[],
): Promise<void> {
    let entries;
    try {
        entries = await readdir(dirPath, { withFileTypes: true });
    } catch (err: unknown) {
        if (
            err &&
            typeof err === 'object' &&
            'code' in err &&
            (err.code === 'ENOENT' || err.code === 'EACCES' || err.code === 'EPERM')
        ) {
            return;
        }
        throw err;
    }

    for (const entry of entries) {
        if (!entry.isDirectory() || shouldSkipDirectory(entry.name)) continue;

        const repoPath = path.resolve(path.join(dirPath, entry.name));
        if (addedPaths.has(repoPath)) continue;

        if (await isGitRepository(repoPath)) {
            available.push({
                name: path.relative(rootPath, repoPath),
                path: repoPath,
            });
            continue;
        }

        await collectGitRepositories(repoPath, rootPath, addedPaths, available);
    }
}

export async function listRepositories(): Promise<Repository[]> {
    const repositories = await readAll();
    return [...repositories].sort((a, b) => a.name.localeCompare(b.name));
}

export async function getRepository(id: string): Promise<Repository | null> {
    const repositories = await readAll();
    return repositories.find((repository) => repository.id === id) ?? null;
}

export async function listAvailableRepositories(): Promise<AvailableRepository[]> {
    const { devDir } = await getSettings();
    const trimmed = devDir.trim();
    if (!trimmed) {
        return [];
    }

    const rootPath = path.resolve(trimmed);
    const added = await readAll();
    const addedPaths = new Set(added.map((repository) => path.resolve(repository.path)));
    const available: AvailableRepository[] = [];

    await collectGitRepositories(rootPath, rootPath, addedPaths, available);

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

    const name = path.relative(trimmedDevDir, resolved) || path.basename(resolved);
    const taken = new Set(repositories.map((repository) => repository.id));
    const repository: Repository = {
        id: uniqueSlug(slugify(path.basename(resolved)), taken),
        name,
        path: resolved,
    };
    repositories.push(repository);
    await writeAll(repositories);
    return repository;
}

export async function removeRepository(id: string): Promise<boolean> {
    const repositories = await readAll();
    const next = repositories.filter((repository) => repository.id !== id);
    if (next.length === repositories.length) {
        return false;
    }
    // Dynamic import avoids a circular dependency with sessions/store.
    const { deleteSessionsForRepository } = await import('@server/libs/sessions/store.js');
    deleteSessionsForRepository(id);
    await writeAll(next);
    return true;
}
