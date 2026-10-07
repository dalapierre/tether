import type { SessionStatus } from '@server/libs/sessions/types.js';
import type { WebSocket } from 'ws';

export type ServerSessionEventMessage =
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
      };

const clients = new Set<WebSocket>();

function send(socket: WebSocket, message: ServerSessionEventMessage): void {
    if (socket.readyState !== socket.OPEN) return;
    try {
        socket.send(JSON.stringify(message));
    } catch {
        clients.delete(socket);
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

export function attachStatusClient(socket: WebSocket): void {
    clients.add(socket);
    socket.on('close', () => {
        clients.delete(socket);
    });
    socket.on('error', () => {
        clients.delete(socket);
    });
}
