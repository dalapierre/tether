import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export type Repository = {
    id: string;
    name: string;
};

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const dataDir = path.join(packageRoot, 'data');
const dataFile = path.join(dataDir, 'repositories.json');

async function ensureDataFile(): Promise<void> {
    await mkdir(dataDir, { recursive: true });
    try {
        await readFile(dataFile, 'utf8');
    } catch (err: unknown) {
        if (err && typeof err === 'object' && 'code' in err && err.code === 'ENOENT') {
            await writeFile(dataFile, '[]\n', 'utf8');
            return;
        }
        throw err;
    }
}

async function readAll(): Promise<Repository[]> {
    await ensureDataFile();
    const raw = await readFile(dataFile, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
        return [];
    }
    return parsed.filter(
        (item): item is Repository =>
            !!item &&
            typeof item === 'object' &&
            typeof (item as Repository).id === 'string' &&
            typeof (item as Repository).name === 'string',
    );
}

async function writeAll(repositories: Repository[]): Promise<void> {
    await ensureDataFile();
    await writeFile(dataFile, `${JSON.stringify(repositories, null, 2)}\n`, 'utf8');
}

export async function listRepositories(): Promise<Repository[]> {
    return readAll();
}

export async function createRepository(name: string): Promise<Repository> {
    const repositories = await readAll();
    const repository: Repository = { id: randomUUID(), name };
    repositories.push(repository);
    await writeAll(repositories);
    return repository;
}
