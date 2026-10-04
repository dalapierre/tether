import { addRepository, listAvailableRepositories, listRepositories } from '@server/libs/repositories/store.js';
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

repositoriesRouter.get('/available', async (_req, res) => {
    try {
        const repositories = await listAvailableRepositories();
        res.json({ repositories });
    } catch (err: unknown) {
        console.error('Failed to list available repositories', err);
        res.status(500).json({ error: 'Failed to list available repositories' });
    }
});

repositoriesRouter.post('/', async (req, res) => {
    const repoPath = typeof req.body?.path === 'string' ? req.body.path.trim() : '';
    if (!repoPath) {
        res.status(400).json({ error: 'Path is required' });
        return;
    }

    try {
        const repository = await addRepository(repoPath);
        res.status(201).json({ repository });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to add repository';
        const status =
            message === 'Repository path is required' ||
            message === 'Development directory is not set' ||
            message === 'Repository must be inside the development directory' ||
            message === 'Path is not a git repository' ||
            message === 'Repository is already added'
                ? 400
                : 500;
        if (status === 500) {
            console.error('Failed to add repository', err);
        }
        res.status(status).json({ error: status === 500 ? 'Failed to add repository' : message });
    }
});
