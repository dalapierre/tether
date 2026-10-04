import { verifyAccessToken } from '@server/libs/authTokens.js';
import { attachSessionTerminal, getSession } from '@server/libs/sessions/store.js';
import type { Server as HttpServer } from 'node:http';
import { WebSocketServer } from 'ws';

const TERMINAL_PATH = /^\/api\/sessions\/([^/]+)\/terminal$/;

export function attachTerminalServer(server: HttpServer): void {
    const wss = new WebSocketServer({ noServer: true });

    server.on('upgrade', (request, socket, head) => {
        const url = new URL(request.url ?? '', 'http://localhost');
        const match = TERMINAL_PATH.exec(url.pathname);
        if (!match) {
            socket.destroy();
            return;
        }

        const token = url.searchParams.get('token') ?? '';
        if (!token || !verifyAccessToken(token)) {
            socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
            socket.destroy();
            return;
        }

        const sessionId = match[1];
        if (!sessionId || !getSession(sessionId)) {
            socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
            socket.destroy();
            return;
        }

        wss.handleUpgrade(request, socket, head, (ws) => {
            const attached = attachSessionTerminal(sessionId, ws);
            if (!attached) {
                ws.close();
            }
        });
    });
}
