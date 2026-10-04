import { createRepository, listRepositories } from '@server/libs/repositories/store.js';
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

repositoriesRouter.post('/', async (req, res) => {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (!name) {
        res.status(400).json({ error: 'Name is required' });
        return;
    }

    try {
        const repository = await createRepository(name);
        res.status(201).json({ repository });
    } catch (err: unknown) {
        console.error('Failed to create repository', err);
        res.status(500).json({ error: 'Failed to create repository' });
    }
});
