import { logger } from '@server/libs/logger.js';
import { restoreSessions } from '@server/libs/sessions/store.js';
import { attachTerminalServer } from '@server/libs/sessions/terminalServer.js';
import { requestLogger } from '@server/middleware/requestLogger.js';
import { requireAuth } from '@server/middleware/requireAuth.js';
import { agentsRouter } from '@server/routes/agents.js';
import { authRouter } from '@server/routes/auth.js';
import { repositoriesRouter } from '@server/routes/repositories.js';
import { sessionsRouter } from '@server/routes/sessions.js';
import { settingsRouter } from '@server/routes/settings.js';
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

const PORT = Number(process.env.PORT) || 1928;
const OVER_NETWORK = process.env.OVER_NETWORK === 'true';
const HOST = OVER_NETWORK ? '0.0.0.0' : '127.0.0.1';

const app = express();

app.use(cors());
app.use(express.json());
app.use(requestLogger);

app.use('/api/auth', authRouter);

app.use('/api', requireAuth);

app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'tether-server' });
});

app.use('/api/settings', settingsRouter);
app.use('/api/repositories', repositoriesRouter);
app.use('/api/agents', agentsRouter);
app.use('/api/sessions', sessionsRouter);

// Command handling will be implemented here later.
app.post('/api/commands', (_req, res) => {
    res.status(501).json({ error: 'Not implemented' });
});

const server = http.createServer(app);
attachTerminalServer(server);

async function start(): Promise<void> {
    try {
        await restoreSessions();
    } catch (err: unknown) {
        logger.error('Failed to restore sessions', err);
    }

    server.listen(PORT, HOST, () => {
        logger.info(`Tether server listening on http://${HOST}:${PORT}`);
        if (OVER_NETWORK) {
            logger.info('OVER_NETWORK=true — accepting connections from the local network');
        }
        if (!process.env.ACCESS_KEY) {
            logger.warn('ACCESS_KEY is not set — authentication will reject all logins');
        }
    });
}

void start();
