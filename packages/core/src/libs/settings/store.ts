import { isAgentId, type AgentId } from '@core/libs/agents/agents.js';
import { getHomeDir, getLegacyServerDataDir, getSettingsFilePath, getTetherHomeDir } from '@core/libs/paths.js';
import { DEFAULT_KEYBINDS, normalizeKeybinds, type Keybinds } from '@core/libs/settings/keybinds.js';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

export type { Keybinds } from '@core/libs/settings/keybinds.js';

export type StoredRepository = {
    id: string;
    name: string;
    path: string;
};

/** Public settings exposed through the settings API/UI. */
export type Settings = {
    devDir: string;
    toastDurationSeconds: number;
    defaultAgent: AgentId;
    defaultYoloMode: boolean;
    defaultUseWorktrees: boolean;
    keybinds: Keybinds;
};

/** Current settings.json schema version. Bump when the on-disk shape changes. */
const SETTINGS_FILE_VERSION = 1;

export const DEFAULT_TOAST_DURATION_SECONDS = 10;
export const MIN_TOAST_DURATION_SECONDS = 1;
export const MAX_TOAST_DURATION_SECONDS = 120;

type SettingsFile = {
    version: number;
    devDir: string;
    toastDurationSeconds: number;
    defaultAgent: AgentId;
    defaultYoloMode: boolean;
    defaultUseWorktrees: boolean;
    keybinds: Keybinds;
    /** Persisted added repositories — not exposed via the settings API/UI. */
    repositories: StoredRepository[];
};

const dataFile = getSettingsFilePath();
const legacyDataFile = path.join(getLegacyServerDataDir(), 'settings.json');

const DEFAULT_AGENT: AgentId = 'cursor';
const DEFAULT_YOLO_MODE = false;
const DEFAULT_USE_WORKTREES = true;

const defaultSettingsFile: SettingsFile = {
    version: SETTINGS_FILE_VERSION,
    devDir: getHomeDir(),
    toastDurationSeconds: DEFAULT_TOAST_DURATION_SECONDS,
    defaultAgent: DEFAULT_AGENT,
    defaultYoloMode: DEFAULT_YOLO_MODE,
    defaultUseWorktrees: DEFAULT_USE_WORKTREES,
    keybinds: DEFAULT_KEYBINDS,
    repositories: [],
};

let legacyMigrated = false;

function isStoredRepository(value: unknown): value is StoredRepository {
    return (
        !!value &&
        typeof value === 'object' &&
        typeof (value as StoredRepository).id === 'string' &&
        typeof (value as StoredRepository).name === 'string' &&
        typeof (value as StoredRepository).path === 'string'
    );
}

function resolveDefaultAgent(value: unknown): AgentId {
    return isAgentId(value) ? value : DEFAULT_AGENT;
}

function resolveBoolean(value: unknown, fallback: boolean): boolean {
    return typeof value === 'boolean' ? value : fallback;
}

/**
 * Derive agent/yolo/worktree defaults from a legacy `profiles` array when present.
 * Prefers the profile matching `defaultProfileId`, otherwise the first valid profile.
 */
function legacyDefaultsFromProfiles(
    profilesRaw: unknown,
    defaultProfileIdRaw: unknown,
): Partial<Pick<SettingsFile, 'defaultAgent' | 'defaultYoloMode' | 'defaultUseWorktrees'>> {
    if (!Array.isArray(profilesRaw)) {
        return {};
    }

    type LegacyProfile = {
        id?: unknown;
        agent?: unknown;
        yoloMode?: unknown;
        useWorktrees?: unknown;
    };

    const profiles = profilesRaw.filter((item): item is LegacyProfile => !!item && typeof item === 'object');
    if (profiles.length === 0) {
        return {};
    }

    const preferredId = typeof defaultProfileIdRaw === 'string' ? defaultProfileIdRaw : null;
    const selected = (preferredId ? profiles.find((profile) => profile.id === preferredId) : undefined) ?? profiles[0];
    if (!selected) {
        return {};
    }

    return {
        defaultAgent: isAgentId(selected.agent) ? selected.agent : undefined,
        defaultYoloMode: typeof selected.yoloMode === 'boolean' ? selected.yoloMode : undefined,
        defaultUseWorktrees: typeof selected.useWorktrees === 'boolean' ? selected.useWorktrees : undefined,
    };
}

export function normalizeToastDurationSeconds(value: unknown): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
        const seconds = Math.round(value);
        if (seconds >= MIN_TOAST_DURATION_SECONDS && seconds <= MAX_TOAST_DURATION_SECONDS) {
            return seconds;
        }
    }
    return DEFAULT_TOAST_DURATION_SECONDS;
}

function toPublicSettings(file: SettingsFile): Settings {
    return {
        devDir: file.devDir,
        toastDurationSeconds: file.toastDurationSeconds,
        defaultAgent: file.defaultAgent,
        defaultYoloMode: file.defaultYoloMode,
        defaultUseWorktrees: file.defaultUseWorktrees,
        keybinds: {
            home: { ...file.keybinds.home },
            session: { ...file.keybinds.session },
        },
    };
}

function normalizeSettingsFile(value: unknown): SettingsFile {
    if (!value || typeof value !== 'object') {
        return {
            ...defaultSettingsFile,
            keybinds: normalizeKeybinds(undefined),
            repositories: [],
        };
    }

    const record = value as Record<string, unknown>;
    const version =
        typeof record.version === 'number' && Number.isInteger(record.version) ? record.version : SETTINGS_FILE_VERSION;
    const devDir = typeof record.devDir === 'string' ? record.devDir : '';
    const toastDurationSeconds = normalizeToastDurationSeconds(record.toastDurationSeconds);
    const fromProfiles = legacyDefaultsFromProfiles(record.profiles, record.defaultProfileId);
    const defaultAgent = resolveDefaultAgent(record.defaultAgent ?? fromProfiles.defaultAgent ?? record.agent);
    const defaultYoloMode = resolveBoolean(
        record.defaultYoloMode ?? fromProfiles.defaultYoloMode ?? record.yoloMode,
        DEFAULT_YOLO_MODE,
    );
    const defaultUseWorktrees = resolveBoolean(
        record.defaultUseWorktrees ?? fromProfiles.defaultUseWorktrees,
        DEFAULT_USE_WORKTREES,
    );
    const keybinds = normalizeKeybinds(record.keybinds);
    const repositories = Array.isArray(record.repositories) ? record.repositories.filter(isStoredRepository) : [];

    return {
        version,
        devDir,
        toastDurationSeconds,
        defaultAgent,
        defaultYoloMode,
        defaultUseWorktrees,
        keybinds,
        repositories,
    };
}

/** One-time: move settings from packages/server/data into ~/.tether. */
async function migrateLegacySettings(): Promise<void> {
    if (legacyMigrated) {
        return;
    }
    legacyMigrated = true;

    try {
        await readFile(dataFile, 'utf8');
        return;
    } catch (err: unknown) {
        if (!(err && typeof err === 'object' && 'code' in err && err.code === 'ENOENT')) {
            throw err;
        }
    }

    let legacyRaw: string;
    try {
        legacyRaw = await readFile(legacyDataFile, 'utf8');
    } catch (err: unknown) {
        if (err && typeof err === 'object' && 'code' in err && err.code === 'ENOENT') {
            return;
        }
        throw err;
    }

    await mkdir(getTetherHomeDir(), { recursive: true });
    try {
        await rename(legacyDataFile, dataFile);
    } catch {
        await writeFile(dataFile, legacyRaw, 'utf8');
    }
}

async function ensureDataFile(): Promise<void> {
    await migrateLegacySettings();
    await mkdir(getTetherHomeDir(), { recursive: true });
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
        return {
            ...defaultSettingsFile,
            keybinds: normalizeKeybinds(undefined),
            repositories: [],
        };
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

export async function updateSettings(patch: {
    devDir?: string;
    toastDurationSeconds?: number;
    defaultAgent?: AgentId;
    defaultYoloMode?: boolean;
    defaultUseWorktrees?: boolean;
    keybinds?: Keybinds;
}): Promise<Settings> {
    const current = await readSettingsFile();
    const defaultAgent = resolveDefaultAgent(patch.defaultAgent ?? current.defaultAgent);
    const defaultYoloMode = resolveBoolean(
        patch.defaultYoloMode !== undefined ? patch.defaultYoloMode : current.defaultYoloMode,
        DEFAULT_YOLO_MODE,
    );
    const defaultUseWorktrees = resolveBoolean(
        patch.defaultUseWorktrees !== undefined ? patch.defaultUseWorktrees : current.defaultUseWorktrees,
        DEFAULT_USE_WORKTREES,
    );
    const keybinds = patch.keybinds ? normalizeKeybinds(patch.keybinds) : current.keybinds;
    const toastDurationSeconds =
        patch.toastDurationSeconds !== undefined
            ? normalizeToastDurationSeconds(patch.toastDurationSeconds)
            : current.toastDurationSeconds;

    const next: SettingsFile = {
        ...current,
        devDir: typeof patch.devDir === 'string' ? patch.devDir : current.devDir,
        toastDurationSeconds,
        defaultAgent,
        defaultYoloMode,
        defaultUseWorktrees,
        keybinds,
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
