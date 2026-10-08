import { isAgentId, type AgentId } from '@server/libs/agents/agents.js';
import { getLegacyServerDataDir, getSettingsFilePath, getTetherHomeDir } from '@server/libs/paths.js';
import { DEFAULT_KEYBINDS, normalizeKeybinds, type Keybinds } from '@server/libs/settings/keybinds.js';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

export type { Keybinds } from '@server/libs/settings/keybinds.js';

export type StoredRepository = {
    id: string;
    name: string;
    path: string;
};

export type AgentProfile = {
    id: string;
    name: string;
    agent: AgentId;
    yoloMode: boolean;
    /** When false, coding sessions run in the repository checkout instead of a worktree. */
    useWorktrees: boolean;
};

/** Public settings exposed through the settings API/UI. */
export type Settings = {
    devDir: string;
    toastDurationSeconds: number;
    authTokenExpirationMinutes: number;
    defaultAgent: AgentId;
    defaultProfileId: string;
    profiles: AgentProfile[];
    keybinds: Keybinds;
};

/** Current settings.json schema version. Bump when the on-disk shape changes. */
const SETTINGS_FILE_VERSION = 1;

export const DEFAULT_TOAST_DURATION_SECONDS = 10;
export const MIN_TOAST_DURATION_SECONDS = 1;
export const MAX_TOAST_DURATION_SECONDS = 120;

export const DEFAULT_AUTH_TOKEN_EXPIRATION_MINUTES = 60;
export const MIN_AUTH_TOKEN_EXPIRATION_MINUTES = 1;
export const MAX_AUTH_TOKEN_EXPIRATION_MINUTES = 1440;

type SettingsFile = {
    version: number;
    devDir: string;
    toastDurationSeconds: number;
    authTokenExpirationMinutes: number;
    defaultAgent: AgentId;
    defaultProfileId: string;
    profiles: AgentProfile[];
    keybinds: Keybinds;
    /** Persisted added repositories — not exposed via the settings API/UI. */
    repositories: StoredRepository[];
};

const dataFile = getSettingsFilePath();
const legacyDataFile = path.join(getLegacyServerDataDir(), 'settings.json');

const DEFAULT_PROFILE_ID = 'default';

function createDefaultProfile(overrides: Partial<AgentProfile> = {}): AgentProfile {
    return {
        id: DEFAULT_PROFILE_ID,
        name: 'Coding',
        agent: 'cursor',
        yoloMode: false,
        useWorktrees: true,
        ...overrides,
    };
}

const DEFAULT_AGENT: AgentId = 'cursor';

const defaultSettingsFile: SettingsFile = {
    version: SETTINGS_FILE_VERSION,
    devDir: '',
    toastDurationSeconds: DEFAULT_TOAST_DURATION_SECONDS,
    authTokenExpirationMinutes: DEFAULT_AUTH_TOKEN_EXPIRATION_MINUTES,
    defaultAgent: DEFAULT_AGENT,
    defaultProfileId: DEFAULT_PROFILE_ID,
    profiles: [createDefaultProfile()],
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

function isAgentProfile(value: unknown): value is AgentProfile {
    if (!value || typeof value !== 'object') return false;
    const profile = value as Partial<AgentProfile> & Record<string, unknown>;
    return (
        typeof profile.id === 'string' &&
        profile.id.length > 0 &&
        typeof profile.name === 'string' &&
        profile.name.trim().length > 0 &&
        isAgentId(profile.agent) &&
        typeof profile.yoloMode === 'boolean'
    );
}

function normalizeProfile(profile: AgentProfile & { useWorktrees?: boolean }): AgentProfile {
    return {
        id: profile.id,
        name: profile.name.trim(),
        agent: profile.agent,
        yoloMode: profile.yoloMode,
        useWorktrees: typeof profile.useWorktrees === 'boolean' ? profile.useWorktrees : true,
    };
}

function normalizeProfiles(value: unknown, legacyAgent?: unknown, legacyYoloMode?: unknown): AgentProfile[] {
    if (Array.isArray(value)) {
        const profiles = value.filter(isAgentProfile).map((profile) => normalizeProfile(profile));
        if (profiles.length > 0) {
            return profiles;
        }
    }

    return [
        createDefaultProfile({
            agent: isAgentId(legacyAgent) ? legacyAgent : 'cursor',
            yoloMode: typeof legacyYoloMode === 'boolean' ? legacyYoloMode : false,
        }),
    ];
}

function resolveDefaultProfileId(value: unknown, profiles: AgentProfile[]): string {
    if (typeof value === 'string' && profiles.some((profile) => profile.id === value)) {
        return value;
    }
    return profiles[0]?.id ?? DEFAULT_PROFILE_ID;
}

function resolveDefaultAgent(value: unknown): AgentId {
    return isAgentId(value) ? value : DEFAULT_AGENT;
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

export function normalizeAuthTokenExpirationMinutes(value: unknown): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
        const minutes = Math.round(value);
        if (minutes >= MIN_AUTH_TOKEN_EXPIRATION_MINUTES && minutes <= MAX_AUTH_TOKEN_EXPIRATION_MINUTES) {
            return minutes;
        }
    }
    return DEFAULT_AUTH_TOKEN_EXPIRATION_MINUTES;
}

function toPublicSettings(file: SettingsFile): Settings {
    return {
        devDir: file.devDir,
        toastDurationSeconds: file.toastDurationSeconds,
        authTokenExpirationMinutes: file.authTokenExpirationMinutes,
        defaultAgent: file.defaultAgent,
        defaultProfileId: file.defaultProfileId,
        profiles: file.profiles.map((profile) => ({ ...profile })),
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
            profiles: [createDefaultProfile()],
            keybinds: normalizeKeybinds(undefined),
            repositories: [],
        };
    }

    const record = value as Record<string, unknown>;
    const version =
        typeof record.version === 'number' && Number.isInteger(record.version) ? record.version : SETTINGS_FILE_VERSION;
    const devDir = typeof record.devDir === 'string' ? record.devDir : '';
    const toastDurationSeconds = normalizeToastDurationSeconds(record.toastDurationSeconds);
    const authTokenExpirationMinutes = normalizeAuthTokenExpirationMinutes(record.authTokenExpirationMinutes);
    const profiles = normalizeProfiles(record.profiles, record.agent, record.yoloMode);
    const defaultAgent = resolveDefaultAgent(record.defaultAgent ?? record.agent);
    const defaultProfileId = resolveDefaultProfileId(record.defaultProfileId, profiles);
    const keybinds = normalizeKeybinds(record.keybinds);
    const repositories = Array.isArray(record.repositories) ? record.repositories.filter(isStoredRepository) : [];

    return {
        version,
        devDir,
        toastDurationSeconds,
        authTokenExpirationMinutes,
        defaultAgent,
        defaultProfileId,
        profiles,
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
            profiles: [createDefaultProfile()],
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

export async function getProfile(profileId: string): Promise<AgentProfile | null> {
    const file = await readSettingsFile();
    return file.profiles.find((profile) => profile.id === profileId) ?? null;
}

export function normalizeIncomingProfiles(value: unknown): AgentProfile[] | null {
    if (!Array.isArray(value) || value.length === 0) {
        return null;
    }

    const profiles: AgentProfile[] = [];
    const seenIds = new Set<string>();

    for (const item of value) {
        if (!isAgentProfile(item)) {
            return null;
        }
        if (seenIds.has(item.id)) {
            return null;
        }
        seenIds.add(item.id);
        profiles.push(normalizeProfile(item));
    }

    return profiles;
}

export async function updateSettings(patch: {
    devDir?: string;
    toastDurationSeconds?: number;
    authTokenExpirationMinutes?: number;
    defaultAgent?: AgentId;
    defaultProfileId?: string;
    profiles?: AgentProfile[];
    keybinds?: Keybinds;
}): Promise<Settings> {
    const current = await readSettingsFile();
    const profiles = patch.profiles ?? current.profiles;
    const defaultAgent = resolveDefaultAgent(patch.defaultAgent ?? current.defaultAgent);
    const defaultProfileId = resolveDefaultProfileId(patch.defaultProfileId ?? current.defaultProfileId, profiles);
    const keybinds = patch.keybinds ? normalizeKeybinds(patch.keybinds) : current.keybinds;
    const toastDurationSeconds =
        patch.toastDurationSeconds !== undefined
            ? normalizeToastDurationSeconds(patch.toastDurationSeconds)
            : current.toastDurationSeconds;
    const authTokenExpirationMinutes =
        patch.authTokenExpirationMinutes !== undefined
            ? normalizeAuthTokenExpirationMinutes(patch.authTokenExpirationMinutes)
            : current.authTokenExpirationMinutes;

    const next: SettingsFile = {
        ...current,
        devDir: typeof patch.devDir === 'string' ? patch.devDir : current.devDir,
        toastDurationSeconds,
        authTokenExpirationMinutes,
        defaultAgent,
        defaultProfileId,
        profiles,
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
