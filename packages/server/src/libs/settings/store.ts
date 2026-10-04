import { isAgentId, type AgentId } from '@server/libs/agents/agents.js';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export type StoredRepository = {
    id: string;
    name: string;
    path: string;
};

/** Public settings exposed through the settings API/UI. */
export type Settings = {
    devDir: string;
    agent: AgentId;
};

type SettingsFile = {
    devDir: string;
    agent: AgentId;
    /** Persisted added repositories — not exposed via the settings API/UI. */
    repositories: StoredRepository[];
};

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const dataDir = path.join(packageRoot, 'data');
const dataFile = path.join(dataDir, 'settings.json');

const defaultSettingsFile: SettingsFile = {
    devDir: '',
    agent: 'cursor',
    repositories: [],
};

function isStoredRepository(value: unknown): value is StoredRepository {
    return (
        !!value &&
        typeof value === 'object' &&
        typeof (value as StoredRepository).id === 'string' &&
        typeof (value as StoredRepository).name === 'string' &&
        typeof (value as StoredRepository).path === 'string'
    );
}

function toPublicSettings(file: SettingsFile): Settings {
    return {
        devDir: file.devDir,
        agent: file.agent,
    };
}

function normalizeSettingsFile(value: unknown): SettingsFile {
    if (!value || typeof value !== 'object') {
        return { ...defaultSettingsFile, repositories: [] };
    }

    const record = value as Record<string, unknown>;
    const devDir = typeof record.devDir === 'string' ? record.devDir : '';
    const agent = isAgentId(record.agent) ? record.agent : defaultSettingsFile.agent;
    const repositories = Array.isArray(record.repositories) ? record.repositories.filter(isStoredRepository) : [];

    return { devDir, agent, repositories };
}

async function ensureDataFile(): Promise<void> {
    await mkdir(dataDir, { recursive: true });
    try {
        await readFile(dataFile, 'utf8');
    } catch (err: unknown) {
        if (err && typeof err === 'object' && 'code' in err && err.code === 'ENOENT') {
            await writeFile(dataFile, `${JSON.stringify(defaultSettingsFile, null, 2)}\n`, 'utf8');
            return;
        }
        throw err;
    }
}

async function readSettingsFile(): Promise<SettingsFile> {
    await ensureDataFile();
    const raw = await readFile(dataFile, 'utf8');
    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch {
        return { ...defaultSettingsFile, repositories: [] };
    }
    return normalizeSettingsFile(parsed);
}

async function writeSettingsFile(next: SettingsFile): Promise<void> {
    await ensureDataFile();
    await writeFile(dataFile, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
}

export async function getSettings(): Promise<Settings> {
    const file = await readSettingsFile();
    return toPublicSettings(file);
}

export async function updateSettings(patch: Partial<Settings>): Promise<Settings> {
    const current = await readSettingsFile();
    const next: SettingsFile = {
        ...current,
        devDir: typeof patch.devDir === 'string' ? patch.devDir : current.devDir,
        agent: isAgentId(patch.agent) ? patch.agent : current.agent,
    };
    await writeSettingsFile(next);
    return toPublicSettings(next);
}

export async function getStoredRepositories(): Promise<StoredRepository[]> {
    const file = await readSettingsFile();
    return [...file.repositories];
}

export async function setStoredRepositories(repositories: StoredRepository[]): Promise<void> {
    const current = await readSettingsFile();
    await writeSettingsFile({
        ...current,
        repositories,
    });
}
