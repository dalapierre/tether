import { logger, sanitizeUrl, type TetherHost } from '@tether/core';
import { asHubClient } from '@host/libs/wsClient.js';
import type { Server as HttpServer } from 'node:http';
import { WebSocketServer } from 'ws';

const TERMINAL_PATH = /^\/api\/sessions\/([^/]+)\/terminal$/;
const SHELL_PATH = /^\/api\/sessions\/([^/]+)\/shell$/;
const EVENTS_PATH = '/api/sessions/events';

export function attachTerminalServer(server: HttpServer, host: TetherHost): void {
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
                host.attachSessionEvents(asHubClient(ws));
            });
            return;
        }

        const sessionId = terminalMatch?.[1] ?? shellMatch?.[1];
        if (!sessionId || !host.hasSession(sessionId)) {
            logger.warn(`WS ${loggedUrl} → 404`);
            socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
            socket.destroy();
            return;
        }

        const isShell = Boolean(shellMatch);
        wss.handleUpgrade(request, socket, head, (ws) => {
            const client = asHubClient(ws);
            const attached = isShell
                ? host.attachSessionShell(sessionId, client)
                : host.attachSessionTerminal(sessionId, client);
            if (!attached) {
                logger.warn(`WS ${pathname} → failed to attach`);
                ws.close();
                return;
            }
            logger.info(`WS ${pathname} → connected`);
        });
    });
}
