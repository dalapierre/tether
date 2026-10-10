import { logger, type TetherHost } from '@tether/core';
import { Router } from 'express';

export function createAgentsRouter(host: TetherHost): Router {
    const router = Router();

    router.get('/', async (_req, res) => {
        try {
            const agents = await host.listAvailableAgents();
            res.json({ agents });
        } catch (err: unknown) {
            logger.error('Failed to list available agents', err);
            res.status(500).json({ error: 'Failed to list available agents' });
        }
    });

    return router;
}
