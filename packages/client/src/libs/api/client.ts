import { clearAccessToken, getAccessToken } from '@client/libs/auth/session';

export class ApiError extends Error {
    readonly status: number;

    constructor(status: number, message: string) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
    }
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers);
    const token = getAccessToken();

    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    if (init.body !== undefined && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    const res = await fetch(path, { ...init, headers });

    if (res.status === 401) {
        clearAccessToken();
    }

    return res;
}
