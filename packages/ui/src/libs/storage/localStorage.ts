function canUseLocalStorage(): boolean {
    try {
        if (typeof localStorage === 'undefined') {
            return false;
        }
        const probe = '__tether_local_storage_probe__';
        localStorage.setItem(probe, '1');
        localStorage.removeItem(probe);
        return true;
    } catch {
        return false;
    }
}

export function getLocalStorageItem(key: string): string | null {
    if (!canUseLocalStorage()) {
        return null;
    }
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
}

export function setLocalStorageItem(key: string, value: string): boolean {
    if (!canUseLocalStorage()) {
        return false;
    }
    try {
        localStorage.setItem(key, value);
        return true;
    } catch {
        return false;
    }
}

export function removeLocalStorageItem(key: string): void {
    if (!canUseLocalStorage()) {
        return;
    }
    try {
        localStorage.removeItem(key);
    } catch {
        // ignore
    }
}

/** Remove every key that starts with `prefix` (safe when localStorage is unavailable). */
export function removeLocalStorageKeysWithPrefix(prefix: string): void {
    if (!canUseLocalStorage() || !prefix) {
        return;
    }
    try {
        const keys: string[] = [];
        for (let i = 0; i < localStorage.length; i += 1) {
            const key = localStorage.key(i);
            if (key?.startsWith(prefix)) {
                keys.push(key);
            }
        }
        for (const key of keys) {
            localStorage.removeItem(key);
        }
    } catch {
        // ignore
    }
}

export function getLocalStorageNumber(key: string): number | null {
    const raw = getLocalStorageItem(key);
    if (raw === null) {
        return null;
    }
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
}

export function setLocalStorageNumber(key: string, value: number): boolean {
    return setLocalStorageItem(key, String(value));
}

export function getLocalStorageJson<T>(key: string): T | null {
    const raw = getLocalStorageItem(key);
    if (raw === null) {
        return null;
    }
    try {
        return JSON.parse(raw) as T;
    } catch {
        return null;
    }
}

export function setLocalStorageJson(key: string, value: unknown): boolean {
    try {
        return setLocalStorageItem(key, JSON.stringify(value));
    } catch {
        return false;
    }
}
