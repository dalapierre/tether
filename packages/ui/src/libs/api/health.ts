import { ApiError, apiFetch } from '@ui/libs/api/client';

export type Health = {
    ok: boolean;
    service: string;
};

export async function fetchHealth(): Promise<Health> {
    const res = await apiFetch('/api/health');
    if (!res.ok) throw new ApiError(res.status, `HTTP ${res.status}`);
    return res.json() as Promise<Health>;
}
