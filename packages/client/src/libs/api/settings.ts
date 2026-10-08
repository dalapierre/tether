import { ApiError, apiFetch } from '@client/libs/api/client';
import type { AgentId } from '@client/libs/agents/agents';
import { DEFAULT_KEYBINDS, cloneKeybinds, type Keybinds } from '@client/libs/keybinds';

const DEFAULT_TOAST_DURATION_SECONDS = 10;
const DEFAULT_AUTH_TOKEN_EXPIRATION_MINUTES = 60;

export type AgentProfile = {
    id: string;
    name: string;
    agent: AgentId;
    yoloMode: boolean;
    useWorktrees: boolean;
};

export type Settings = {
    devDir: string;
    toastDurationSeconds: number;
    authTokenExpirationMinutes: number;
    defaultAgent: AgentId;
    defaultProfileId: string;
    profiles: AgentProfile[];
    keybinds: Keybinds;
};

type SettingsResponse = {
    settings: Settings;
};

function normalizeToastDurationSeconds(value: unknown): number {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
        return Math.round(value);
    }
    return DEFAULT_TOAST_DURATION_SECONDS;
}

function normalizeAuthTokenExpirationMinutes(value: unknown): number {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
        return Math.round(value);
    }
    return DEFAULT_AUTH_TOKEN_EXPIRATION_MINUTES;
}

function normalizeSettings(settings: Settings): Settings {
    return {
        ...settings,
        toastDurationSeconds: normalizeToastDurationSeconds(settings.toastDurationSeconds),
        authTokenExpirationMinutes: normalizeAuthTokenExpirationMinutes(settings.authTokenExpirationMinutes),
        keybinds: settings.keybinds ? cloneKeybinds(settings.keybinds) : cloneKeybinds(DEFAULT_KEYBINDS),
    };
}

export async function getSettings(): Promise<Settings> {
    const res = await apiFetch('/api/settings');

    if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new ApiError(res.status, body?.error ?? `HTTP ${res.status}`);
    }

    const data = (await res.json()) as SettingsResponse;
    return normalizeSettings(data.settings);
}

export async function updateSettings(settings: Settings): Promise<Settings> {
    const res = await apiFetch('/api/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
    });

    if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new ApiError(res.status, body?.error ?? `HTTP ${res.status}`);
    }

    const data = (await res.json()) as SettingsResponse;
    return normalizeSettings(data.settings);
}
