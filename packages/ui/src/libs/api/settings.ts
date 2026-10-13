import { ApiError, apiFetch } from '@ui/libs/api/client';
import type { AgentId } from '@ui/libs/agents/agents';
import { DEFAULT_KEYBINDS, cloneKeybinds, type Keybinds } from '@ui/libs/keybinds';

const DEFAULT_TOAST_DURATION_SECONDS = 10;

export type Settings = {
    devDir: string;
    toastDurationSeconds: number;
    defaultAgent: AgentId;
    defaultYoloMode: boolean;
    defaultUseWorktrees: boolean;
    keybinds: Keybinds;
    /** Absolute default worktrees root (`$HOME/.tether/worktrees`). Read-only. */
    worktreesDir: string;
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

function normalizeSettings(settings: Settings): Settings {
    return {
        ...settings,
        toastDurationSeconds: normalizeToastDurationSeconds(settings.toastDurationSeconds),
        keybinds: settings.keybinds ? cloneKeybinds(settings.keybinds) : cloneKeybinds(DEFAULT_KEYBINDS),
        worktreesDir: typeof settings.worktreesDir === 'string' ? settings.worktreesDir : '',
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

export async function updateSettings(settings: Omit<Settings, 'worktreesDir'>): Promise<Settings> {
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
