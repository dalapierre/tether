import { logger, sanitizeUrl } from '@server/libs/logger.js';
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
        const rawUrl = request.url ?? '';
        const url = new URL(rawUrl, 'http://localhost');
        const pathname = url.pathname;
        const loggedUrl = sanitizeUrl(rawUrl);
        const terminalMatch = TERMINAL_PATH.exec(pathname);
        const shellMatch = SHELL_PATH.exec(pathname);
        const isEvents = pathname === EVENTS_PATH;

        if (!terminalMatch && !shellMatch && !isEvents) {
            socket.destroy();
            return;
        }

        logger.info(`WS ${loggedUrl}`);

        if (isEvents) {
            wss.handleUpgrade(request, socket, head, (ws) => {
                logger.info(`WS ${pathname} → connected`);
                attachSessionEvents(ws);
            });
            return;
        }

        const sessionId = terminalMatch?.[1] ?? shellMatch?.[1];
        if (!sessionId || !hasSession(sessionId)) {
            logger.warn(`WS ${loggedUrl} → 404`);
            socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
            socket.destroy();
            return;
        }

        const isShell = Boolean(shellMatch);
        wss.handleUpgrade(request, socket, head, (ws) => {
            const attached = isShell ? attachSessionShell(sessionId, ws) : attachSessionTerminal(sessionId, ws);
            if (!attached) {
                logger.warn(`WS ${pathname} → failed to attach`);
                ws.close();
                return;
            }
            logger.info(`WS ${pathname} → connected`);
        });
    });
}
