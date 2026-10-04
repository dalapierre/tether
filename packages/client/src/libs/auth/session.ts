const TOKEN_KEY = 'tether_access_token';
const EXPIRES_AT_KEY = 'tether_access_token_expires_at';

export function getAccessToken(): string | null {
    const token = sessionStorage.getItem(TOKEN_KEY);
    const expiresAtRaw = sessionStorage.getItem(EXPIRES_AT_KEY);
    if (!token || !expiresAtRaw) return null;

    const expiresAt = Number(expiresAtRaw);
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
        clearAccessToken();
        return null;
    }

    return token;
}

export function setAccessToken(token: string, expiresAt: number): void {
    sessionStorage.setItem(TOKEN_KEY, token);
    sessionStorage.setItem(EXPIRES_AT_KEY, String(expiresAt));
}

export function clearAccessToken(): void {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(EXPIRES_AT_KEY);
}

export function isAuthenticated(): boolean {
    return getAccessToken() !== null;
}
