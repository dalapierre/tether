import { ApiError, apiFetch } from '@client/libs/api/client';
import type { AgentId } from '@client/libs/agents/agents';
import { getAccessToken } from '@client/libs/auth/session';

export type SessionStatus = 'ready' | 'busy' | 'error';

export type SessionType = 'coding' | 'conversation';

export type Session = {
    id: string;
    name: string;
    agent: AgentId;
    type: SessionType;
    repositoryId: string | null;
    branch: string | null;
    behindDefault: number | null;
    status: SessionStatus;
    createdAt: number;
};

export type ServerTerminalMessage =
    { type: 'history'; data: string } | { type: 'output'; data: string } | { type: 'status'; status: SessionStatus };

export type ClientTerminalMessage =
    | { type: 'message'; text: string }
    | { type: 'input'; data: string }
    | { type: 'resize'; cols: number; rows: number };

export type DiffFileStatus = 'added' | 'modified' | 'deleted' | 'renamed';

export type SessionDiffFile = {
    path: string;
    oldPath?: string;
    status: DiffFileStatus;
    additions: number | null;
    deletions: number | null;
    binary: boolean;
};

export type SessionDiffSummary = {
    baseSha: string;
    files: SessionDiffFile[];
};

export type SessionFileDiff = {
    path: string;
    oldPath?: string;
    status: DiffFileStatus;
    language: string;
    original: string;
    modified: string;
    binary: boolean;
};

type ListResponse = {
    sessions: Session[];
};

type SessionResponse = {
    session: Session;
};

type DiffResponse = {
    diff: SessionDiffSummary;
};

type FileDiffResponse = {
    file: SessionFileDiff;
};

export async function listSessions(repositoryId?: string): Promise<Session[]> {
    const params = new URLSearchParams();
    if (repositoryId) {
        params.set('repositoryId', repositoryId);
    }
    const query = params.toString();
    const res = await apiFetch(query ? `/api/sessions?${query}` : '/api/sessions');

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

export async function createSession(input: {
    profileId: string;
    name: string;
    repositoryId?: string;
    branch?: string;
}): Promise<Session> {
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

export async function getSessionDiff(sessionId: string): Promise<SessionDiffSummary> {
    const res = await apiFetch(`/api/sessions/${encodeURIComponent(sessionId)}/diff`);

    if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new ApiError(res.status, body?.error ?? `HTTP ${res.status}`);
    }

    const data = (await res.json()) as DiffResponse;
    return data.diff;
}

export async function getSessionDiffFile(sessionId: string, filePath: string): Promise<SessionFileDiff> {
    const params = new URLSearchParams({ path: filePath });
    const res = await apiFetch(`/api/sessions/${encodeURIComponent(sessionId)}/diff/file?${params}`);

    if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new ApiError(res.status, body?.error ?? `HTTP ${res.status}`);
    }

    const data = (await res.json()) as FileDiffResponse;
    return data.file;
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
