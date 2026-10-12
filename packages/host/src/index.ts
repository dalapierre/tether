import { createHost, logger } from '@tether/core';
import { attachTerminalServer } from '@host/libs/sessions/terminalServer.js';
import { requestLogger } from '@host/middleware/requestLogger.js';
import { registerHttpRoutes } from '@host/routes/register.js';
import { serveUi } from '@host/serveUi.js';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(packageRoot, '../..');

dotenv.config({ path: path.join(repoRoot, '.env') });
dotenv.config({ path: path.join(packageRoot, '.env') });

const isDev = process.env.NODE_ENV !== 'production';
const PORT = isDev ? Number(process.env.PORT) || 1111 : 1928;
const HOST = '0.0.0.0';

async function start(): Promise<void> {
    const tetherHost = await createHost();

    const app = express();
    app.use(cors());
    app.use(express.json());
    app.use(requestLogger);

    registerHttpRoutes(app, tetherHost);

    const server = http.createServer(app);
    attachTerminalServer(server, tetherHost);

    // Dev: Vite middleware + HMR. Prod: static dist/ui (no HMR).
    await serveUi(app, server, isDev);

    server.listen(PORT, HOST, () => {
        logger.info(`Tether host listening on http://${HOST}:${PORT}`);
    });
}

void start().catch((err: unknown) => {
    logger.error('Host failed to start', err);
    process.exit(1);
});
