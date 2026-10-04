import { SUPPORTED_AGENTS } from '@server/libs/agents/agents.js';
import { Router } from 'express';

export const agentsRouter = Router();

agentsRouter.get('/', (_req, res) => {
    res.json({ agents: SUPPORTED_AGENTS });
});
