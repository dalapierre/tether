import { ApiError, apiFetch } from '@client/libs/api/client';
import type { AgentId } from '@client/libs/agents/agents';

export type Settings = {
    devDir: string;
    agent: AgentId;
};

type SettingsResponse = {
    settings: Settings;
};

export async function getSettings(): Promise<Settings> {
    const res = await apiFetch('/api/settings');

    if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new ApiError(res.status, body?.error ?? `HTTP ${res.status}`);
    }

    const data = (await res.json()) as SettingsResponse;
    return data.settings;
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
    return data.settings;
}
