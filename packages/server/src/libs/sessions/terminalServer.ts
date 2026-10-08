import { verifyAccessToken } from '@server/libs/authTokens.js';
import {
    attachSessionEvents,
    attachSessionShell,
    attachSessionTerminal,
    hasSession,
} from '@server/libs/sessions/store.js';
import type { Server as HttpServer } from 'node:http';
import { WebSocketServer } from 'ws';

const TERMINAL_PATH = /^\/api\/sessions\/([^/]+)\/terminal$/;
const SHELL_PATH = /^\/api\/sessions\/([^/]+)\/shell$/;
const EVENTS_PATH = '/api/sessions/events';

export function attachTerminalServer(server: HttpServer): void {
    const wss = new WebSocketServer({ noServer: true });

    server.on('upgrade', (request, socket, head) => {
        const url = new URL(request.url ?? '', 'http://localhost');
        const pathname = url.pathname;
        const terminalMatch = TERMINAL_PATH.exec(pathname);
        const shellMatch = SHELL_PATH.exec(pathname);
        const isEvents = pathname === EVENTS_PATH;

        if (!terminalMatch && !shellMatch && !isEvents) {
            socket.destroy();
            return;
        }

        const token = url.searchParams.get('token') ?? '';
        if (!token || !verifyAccessToken(token)) {
            socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
            socket.destroy();
            return;
        }

        if (isEvents) {
            wss.handleUpgrade(request, socket, head, (ws) => {
                attachSessionEvents(ws);
            });
            return;
        }

        const sessionId = terminalMatch?.[1] ?? shellMatch?.[1];
        if (!sessionId || !hasSession(sessionId)) {
            socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
            socket.destroy();
            return;
        }

        const isShell = Boolean(shellMatch);
        wss.handleUpgrade(request, socket, head, (ws) => {
            const attached = isShell ? attachSessionShell(sessionId, ws) : attachSessionTerminal(sessionId, ws);
            if (!attached) {
                ws.close();
            }
        });
    });
}
