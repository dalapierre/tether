import { listRepositories } from '@server/libs/repositories/store.js';
import { Router } from 'express';

export const repositoriesRouter = Router();

repositoriesRouter.get('/', async (_req, res) => {
    try {
        const repositories = await listRepositories();
        res.json({ repositories });
    } catch (err: unknown) {
        console.error('Failed to list repositories', err);
        res.status(500).json({ error: 'Failed to list repositories' });
    }
});
