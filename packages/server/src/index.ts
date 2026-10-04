import { requireAuth } from '@server/middleware/requireAuth.js';
import { authRouter } from '@server/routes/auth.js';
import { repositoriesRouter } from '@server/routes/repositories.js';
import { settingsRouter } from '@server/routes/settings.js';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(packageRoot, '../..');

dotenv.config({ path: path.join(repoRoot, '.env') });
dotenv.config({ path: path.join(packageRoot, '.env') });

const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || '0.0.0.0';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRouter);

app.use('/api', requireAuth);

app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'tether-server' });
});

app.use('/api/settings', settingsRouter);
app.use('/api/repositories', repositoriesRouter);

// Command handling will be implemented here later.
app.post('/api/commands', (_req, res) => {
    res.status(501).json({ error: 'Not implemented' });
});

app.listen(PORT, HOST, () => {
    console.log(`Tether server listening on http://${HOST}:${PORT}`);
    if (!process.env.ACCESS_KEY) {
        console.warn('ACCESS_KEY is not set — authentication will reject all logins');
    }
});
