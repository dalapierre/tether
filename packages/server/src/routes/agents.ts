import { listAvailableAgents } from '@server/libs/agents/agents.js';
import { Router } from 'express';

export const agentsRouter = Router();

agentsRouter.get('/', async (_req, res) => {
    try {
        const agents = await listAvailableAgents();
        res.json({ agents });
    } catch (err: unknown) {
        console.error('Failed to list available agents', err);
        res.status(500).json({ error: 'Failed to list available agents' });
    }
});
