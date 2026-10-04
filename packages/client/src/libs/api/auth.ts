import { ApiError, apiFetch } from '@client/libs/api/client';
import { clearAccessToken, setAccessToken } from '@client/libs/auth/session';

export type LoginResponse = {
    token: string;
    expiresAt: number;
};

export async function login(accessKey: string): Promise<LoginResponse> {
    const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ accessKey }),
    });

    if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new ApiError(res.status, body?.error ?? `HTTP ${res.status}`);
    }

    const data = (await res.json()) as LoginResponse;
    setAccessToken(data.token, data.expiresAt);
    return data;
}

export function logout(): void {
    clearAccessToken();
}
