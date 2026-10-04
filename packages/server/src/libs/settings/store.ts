import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export type Settings = {
    devDir: string;
};

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const dataDir = path.join(packageRoot, 'data');
const dataFile = path.join(dataDir, 'settings.json');

const defaultSettings: Settings = {
    devDir: '',
};

function isSettings(value: unknown): value is Settings {
    return !!value && typeof value === 'object' && typeof (value as Settings).devDir === 'string';
}

async function ensureDataFile(): Promise<void> {
    await mkdir(dataDir, { recursive: true });
    try {
        await readFile(dataFile, 'utf8');
    } catch (err: unknown) {
        if (err && typeof err === 'object' && 'code' in err && err.code === 'ENOENT') {
            await writeFile(dataFile, `${JSON.stringify(defaultSettings, null, 2)}\n`, 'utf8');
            return;
        }
        throw err;
    }
}

export async function getSettings(): Promise<Settings> {
    await ensureDataFile();
    const raw = await readFile(dataFile, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    if (!isSettings(parsed)) {
        return { ...defaultSettings };
    }
    return { devDir: parsed.devDir };
}

export async function updateSettings(patch: Partial<Settings>): Promise<Settings> {
    const current = await getSettings();
    const next: Settings = {
        devDir: typeof patch.devDir === 'string' ? patch.devDir : current.devDir,
    };
    await ensureDataFile();
    await writeFile(dataFile, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
    return next;
}
