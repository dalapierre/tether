import { ApiError, apiFetch } from '@client/libs/api/client';
import type { AgentId } from '@client/libs/agents/agents';
import { getAccessToken } from '@client/libs/auth/session';

export type SessionStatus = 'ready' | 'busy' | 'error';

export type Session = {
    id: string;
    name: string;
    agent: AgentId;
    repositoryId: string;
    branch: string;
    status: SessionStatus;
    createdAt: number;
};

export type ServerTerminalMessage =
    { type: 'history'; data: string } | { type: 'output'; data: string } | { type: 'status'; status: SessionStatus };

export type ClientTerminalMessage =
    | { type: 'message'; text: string }
    | { type: 'input'; data: string }
    | { type: 'resize'; cols: number; rows: number };

type ListResponse = {
    sessions: Session[];
};

type SessionResponse = {
    session: Session;
};

export async function listSessions(repositoryId: string): Promise<Session[]> {
    const params = new URLSearchParams({ repositoryId });
    const res = await apiFetch(`/api/sessions?${params}`);

    if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new ApiError(res.status, body?.error ?? `HTTP ${res.status}`);
    }

    const data = (await res.json()) as ListResponse;
    return data.sessions;
}

export async function getSession(id: string): Promise<Session | null> {
    const res = await apiFetch(`/api/sessions/${id}`);

    if (res.status === 404) {
        return null;
    }

    if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new ApiError(res.status, body?.error ?? `HTTP ${res.status}`);
    }

    const data = (await res.json()) as SessionResponse;
    return data.session;
}

export async function createSession(input: { repositoryId: string; name: string; agent: AgentId }): Promise<Session> {
    const res = await apiFetch('/api/sessions', {
        method: 'POST',
        body: JSON.stringify(input),
    });

    if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new ApiError(res.status, body?.error ?? `HTTP ${res.status}`);
    }

    const data = (await res.json()) as SessionResponse;
    return data.session;
}

export async function deleteSession(id: string): Promise<void> {
    const res = await apiFetch(`/api/sessions/${encodeURIComponent(id)}`, {
        method: 'DELETE',
    });

    if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new ApiError(res.status, body?.error ?? `HTTP ${res.status}`);
    }
}

export function connectSessionTerminal(sessionId: string): WebSocket {
    const token = getAccessToken();
    if (!token) {
        throw new Error('Not authenticated');
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}/api/sessions/${encodeURIComponent(sessionId)}/terminal?token=${encodeURIComponent(token)}`;
    return new WebSocket(url);
}

export function sendTerminalMessage(socket: WebSocket, message: ClientTerminalMessage): void {
    if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(message));
    }
}
