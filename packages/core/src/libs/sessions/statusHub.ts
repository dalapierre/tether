import type { HubClient } from '@core/libs/hubClient.js';
import type { Session, SessionStatus } from '@core/libs/sessions/types.js';

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
          /** Client should refetch diff summary / file contents for this session. */
          type: 'diff';
          sessionId: string;
      };

const clients = new Set<HubClient>();

function send(socket: HubClient, message: ServerSessionEventMessage): void {
    if (socket.readyState !== socket.OPEN) return;
    try {
        socket.send(JSON.stringify(message));
    } catch {
        clients.delete(socket);
    }
}

export function sendSessionEvent(socket: HubClient, message: ServerSessionEventMessage): void {
    send(socket, message);
}

export function broadcastSessionSnapshot(sessions: Session[]): void {
    const message: ServerSessionEventMessage = { type: 'snapshot', sessions };
    for (const client of clients) {
        send(client, message);
    }
}

export function broadcastSessionUpsert(session: Session): void {
    const message: ServerSessionEventMessage = { type: 'upsert', session };
    for (const client of clients) {
        send(client, message);
    }
}

export function broadcastSessionRemove(sessionId: string): void {
    const message: ServerSessionEventMessage = { type: 'remove', sessionId };
    for (const client of clients) {
        send(client, message);
    }
}

export function broadcastSessionStatus(input: { sessionId: string; name: string; status: SessionStatus }): void {
    const message: ServerSessionEventMessage = {
        type: 'status',
        sessionId: input.sessionId,
        name: input.name,
        status: input.status,
    };
    for (const client of clients) {
        send(client, message);
    }
}

export function broadcastSessionBranch(input: {
    sessionId: string;
    branch: string | null;
    behindDefault: number | null;
    defaultBranch: string | null;
}): void {
    const message: ServerSessionEventMessage = {
        type: 'branch',
        sessionId: input.sessionId,
        branch: input.branch,
        behindDefault: input.behindDefault,
        defaultBranch: input.defaultBranch,
    };
    for (const client of clients) {
        send(client, message);
    }
}

export function broadcastSessionUsage(input: {
    sessionId: string;
    cpuPercent: number | null;
    ramPercent: number | null;
}): void {
    const message: ServerSessionEventMessage = {
        type: 'usage',
        sessionId: input.sessionId,
        cpuPercent: input.cpuPercent,
        ramPercent: input.ramPercent,
    };
    for (const client of clients) {
        send(client, message);
    }
}

export function broadcastSessionDiff(sessionId: string): void {
    const message: ServerSessionEventMessage = { type: 'diff', sessionId };
    for (const client of clients) {
        send(client, message);
    }
}

export function attachStatusClient(socket: HubClient): void {
    clients.add(socket);
    socket.on('close', () => {
        clients.delete(socket);
    });
    socket.on('error', () => {
        clients.delete(socket);
    });
}
