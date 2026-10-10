import type { TetherHost } from '@tether/core';
import { createAgentsRouter } from '@host/routes/agents.js';
import { createRepositoriesRouter } from '@host/routes/repositories.js';
import { createSessionsRouter } from '@host/routes/sessions.js';
import { createSettingsRouter } from '@host/routes/settings.js';
import type { Express } from 'express';

export function registerHttpRoutes(app: Express, host: TetherHost): void {
    app.get('/api/health', (_req, res) => {
        res.json({ ok: true, service: 'tether-host' });
    });

    app.use('/api/settings', createSettingsRouter(host));
    app.use('/api/repositories', createRepositoriesRouter(host));
    app.use('/api/agents', createAgentsRouter(host));
    app.use('/api/sessions', createSessionsRouter(host));

    app.post('/api/commands', (_req, res) => {
        res.status(501).json({ error: 'Not implemented' });
    });
}
