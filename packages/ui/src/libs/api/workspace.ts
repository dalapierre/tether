import { ApiError, apiFetch } from '@ui/libs/api/client';
import { getTransport } from '@ui/libs/api/transport';

/** UI cap for workspace terminal splits (matches session shell panel / roster). */
export const MAX_WORKSPACE_SHELLS = 4;

/** Kill one workspace shell, or all of them when `shellId` is omitted. */
export async function killWorkspaceShell(shellId?: string): Promise<void> {
    const path = shellId === undefined ? '/api/workspace/shell' : `/api/workspace/shell/${encodeURIComponent(shellId)}`;
    const res = await apiFetch(path, {
        method: 'DELETE',
    });

    if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new ApiError(res.status, body?.error ?? `HTTP ${res.status}`);
    }
}

/** Connect to a workspace shell (cwd = settings workspace directory). */
export function connectWorkspaceShell(shellId: string): WebSocket {
    return getTransport().openWebSocket(`/api/workspace/shell/${encodeURIComponent(shellId)}`);
}
