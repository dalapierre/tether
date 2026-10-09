import { ApiError, apiFetch } from '@client/libs/api/client';
import { isAgentId, type AgentId } from '@client/libs/agents/agents';
import { getAccessToken } from '@client/libs/auth/session';
import { clearSessionLocalStorage } from '@client/libs/storage/sessionLocalStorage';

export type SessionStatus = 'ready' | 'busy' | 'error';

export type SessionType = 'coding' | 'conversation';

export type Session = {
    id: string;
    name: string;
    profileId: string;
    agent: AgentId;
    type: SessionType;
    repositoryId: string | null;
    branch: string | null;
    behindDefault: number | null;
    defaultBranch: string | null;
    cpuPercent: number | null;
    ramPercent: number | null;
    status: SessionStatus;
    createdAt: number;
};

export type ServerTerminalMessage =
    { type: 'history'; data: string } | { type: 'output'; data: string } | { type: 'status'; status: SessionStatus };

export type ServerSessionEventMessage =
    | {
          type: 'snapshot';
          sessions: Session[];
      }
    | {
          type: 'upsert';
          session: Session;
      }
    | {
          type: 'remove';
          sessionId: string;
      }
    | {
          type: 'status';
          sessionId: string;
          name: string;
          status: SessionStatus;
      }
    | {
          type: 'branch';
          sessionId: string;
          branch: string | null;
          behindDefault: number | null;
          defaultBranch: string | null;
      }
    | {
          type: 'usage';
          sessionId: string;
          cpuPercent: number | null;
          ramPercent: number | null;
      }
    | {
          type: 'diff';
          sessionId: string;
      };

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
    pending?: boolean;
};

export type SessionDiffFetchResult = {
    diff: SessionDiffSummary;
    pending: boolean;
};

type FileDiffResponse = {
    file: SessionFileDiff;
};

function isSessionStatus(value: unknown): value is SessionStatus {
    return value === 'ready' || value === 'busy' || value === 'error';
}

function isSessionType(value: unknown): value is SessionType {
    return value === 'coding' || value === 'conversation';
}

function isNullableNumber(value: unknown): value is number | null {
    return value === null || typeof value === 'number';
}

function isSession(value: unknown): value is Session {
    if (!value || typeof value !== 'object') return false;
    const session = value as Partial<Session>;
    return (
        typeof session.id === 'string' &&
        typeof session.name === 'string' &&
        typeof session.profileId === 'string' &&
        typeof session.agent === 'string' &&
        isAgentId(session.agent) &&
        isSessionType(session.type) &&
        (session.repositoryId === null || typeof session.repositoryId === 'string') &&
        (session.branch === null || typeof session.branch === 'string') &&
        (session.behindDefault === null || typeof session.behindDefault === 'number') &&
        (session.defaultBranch === null || typeof session.defaultBranch === 'string') &&
        // Older servers omit usage fields; treat missing as null.
        (session.cpuPercent === undefined || isNullableNumber(session.cpuPercent)) &&
        (session.ramPercent === undefined || isNullableNumber(session.ramPercent)) &&
        isSessionStatus(session.status) &&
        typeof session.createdAt === 'number'
    );
}

function normalizeSession(session: Session): Session {
    return {
        ...session,
        cpuPercent: session.cpuPercent ?? null,
        ramPercent: session.ramPercent ?? null,
    };
}

export function parseServerSessionEventMessage(raw: string): ServerSessionEventMessage | null {
    try {
        const parsed = JSON.parse(raw) as ServerSessionEventMessage;
        if (!parsed || typeof parsed !== 'object' || !('type' in parsed)) {
            return null;
        }
        if (parsed.type === 'snapshot') {
            if (!Array.isArray(parsed.sessions) || !parsed.sessions.every(isSession)) {
                return null;
            }
            return {
                type: 'snapshot',
                sessions: parsed.sessions.map(normalizeSession),
            };
        }
        if (parsed.type === 'upsert') {
            if (!isSession(parsed.session)) {
                return null;
            }
            return {
                type: 'upsert',
                session: normalizeSession(parsed.session),
            };
        }
        if (parsed.type === 'remove') {
            if (typeof parsed.sessionId !== 'string') {
                return null;
            }
            return parsed;
        }
        if (parsed.type === 'status') {
            if (typeof parsed.sessionId !== 'string' || typeof parsed.name !== 'string') {
                return null;
            }
            if (!isSessionStatus(parsed.status)) {
                return null;
            }
            return parsed;
        }
        if (parsed.type === 'branch') {
            if (typeof parsed.sessionId !== 'string') {
                return null;
            }
            if (parsed.branch !== null && typeof parsed.branch !== 'string') {
                return null;
            }
            if (parsed.behindDefault !== null && typeof parsed.behindDefault !== 'number') {
                return null;
            }
            if (parsed.defaultBranch !== null && typeof parsed.defaultBranch !== 'string') {
                return null;
            }
            return parsed;
        }
        if (parsed.type === 'usage') {
            if (typeof parsed.sessionId !== 'string') {
                return null;
            }
            if (!isNullableNumber(parsed.cpuPercent) || !isNullableNumber(parsed.ramPercent)) {
                return null;
            }
            return parsed;
        }
        if (parsed.type === 'diff') {
            if (typeof parsed.sessionId !== 'string') {
                return null;
            }
            return parsed;
        }
        return null;
    } catch {
        return null;
    }
}

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
    return data.sessions.filter(isSession).map(normalizeSession);
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
    return isSession(data.session) ? normalizeSession(data.session) : null;
}

export async function createSession(input: {
    profileId: string;
    name: string;
    repositoryId?: string;
    branch?: string;
    workingDirectory?: string;
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
    if (!isSession(data.session)) {
        throw new ApiError(res.status, 'Invalid session response');
    }
    return normalizeSession(data.session);
}

export async function deleteSession(id: string): Promise<void> {
    const res = await apiFetch(`/api/sessions/${encodeURIComponent(id)}`, {
        method: 'DELETE',
    });

    if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new ApiError(res.status, body?.error ?? `HTTP ${res.status}`);
    }

    clearSessionLocalStorage(id);
}

/** Kill the session's built-in user shell PTY (not the agent). */
export async function killSessionShell(id: string): Promise<void> {
    const res = await apiFetch(`/api/sessions/${encodeURIComponent(id)}/shell`, {
        method: 'DELETE',
    });

    if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new ApiError(res.status, body?.error ?? `HTTP ${res.status}`);
    }
}

export async function restartSession(id: string): Promise<Session> {
    const res = await apiFetch(`/api/sessions/${encodeURIComponent(id)}/restart`, {
        method: 'POST',
    });

    if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new ApiError(res.status, body?.error ?? `HTTP ${res.status}`);
    }

    const data = (await res.json()) as SessionResponse;
    if (!isSession(data.session)) {
        throw new ApiError(res.status, 'Invalid session response');
    }
    return normalizeSession(data.session);
}

export async function getSessionDiff(
    sessionId: string,
    init: { signal?: AbortSignal } = {},
): Promise<SessionDiffFetchResult> {
    const res = await apiFetch(`/api/sessions/${encodeURIComponent(sessionId)}/diff`, {
        signal: init.signal,
    });

    if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new ApiError(res.status, body?.error ?? `HTTP ${res.status}`);
    }

    const data = (await res.json()) as DiffResponse;
    return { diff: data.diff, pending: Boolean(data.pending) };
}

export async function getSessionDiffFile(
    sessionId: string,
    filePath: string,
    init: { signal?: AbortSignal } = {},
): Promise<SessionFileDiff> {
    const params = new URLSearchParams({ path: filePath });
    const res = await apiFetch(`/api/sessions/${encodeURIComponent(sessionId)}/diff/file?${params}`, {
        signal: init.signal,
    });

    if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new ApiError(res.status, body?.error ?? `HTTP ${res.status}`);
    }

    const data = (await res.json()) as FileDiffResponse;
    return data.file;
}

export async function discardSessionDiffFile(sessionId: string, filePath: string): Promise<void> {
    const res = await apiFetch(`/api/sessions/${encodeURIComponent(sessionId)}/diff/discard`, {
        method: 'POST',
        body: JSON.stringify({ path: filePath }),
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

/** Connect to the session's built-in user shell (cwd = session workspace). */
export function connectSessionShell(sessionId: string): WebSocket {
    const token = getAccessToken();
    if (!token) {
        throw new Error('Not authenticated');
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}/api/sessions/${encodeURIComponent(sessionId)}/shell?token=${encodeURIComponent(token)}`;
    return new WebSocket(url);
}

export function connectSessionEvents(): WebSocket {
    const token = getAccessToken();
    if (!token) {
        throw new Error('Not authenticated');
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}/api/sessions/events?token=${encodeURIComponent(token)}`;
    return new WebSocket(url);
}

export function sendTerminalMessage(socket: WebSocket, message: ClientTerminalMessage): void {
    if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(message));
    }
}
