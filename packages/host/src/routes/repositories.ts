import { logger, type TetherHost } from '@tether/core';
import { Router } from 'express';

export function createRepositoriesRouter(host: TetherHost): Router {
    const router = Router();

    router.get('/', async (_req, res) => {
        try {
            const repositories = await host.listRepositories();
            res.json({ repositories });
        } catch (err: unknown) {
            logger.error('Failed to list repositories', err);
            res.status(500).json({ error: 'Failed to list repositories' });
        }
    });

    router.get('/available', async (_req, res) => {
        try {
            const repositories = await host.listAvailableRepositories();
            res.json({ repositories });
        } catch (err: unknown) {
            logger.error('Failed to list available repositories', err);
            res.status(500).json({ error: 'Failed to list available repositories' });
        }
    });

    router.get('/:id/branches', async (req, res) => {
        try {
            const branches = await host.listRepositoryBranches(req.params.id);
            if (!branches) {
                res.status(404).json({ error: 'Repository not found' });
                return;
            }
            res.json({ branches });
        } catch (err: unknown) {
            logger.error('Failed to list repository branches', err);
            res.status(500).json({ error: 'Failed to list branches' });
        }
    });

    router.get('/:id/directories', async (req, res) => {
        try {
            const directories = await host.listRepositoryDirectories(req.params.id);
            if (!directories) {
                res.status(404).json({ error: 'Repository not found' });
                return;
            }
            res.json({ directories });
        } catch (err: unknown) {
            logger.error('Failed to list repository directories', err);
            res.status(500).json({ error: 'Failed to list directories' });
        }
    });

    router.post('/', async (req, res) => {
        const repoPath = typeof req.body?.path === 'string' ? req.body.path.trim() : '';
        if (!repoPath) {
            res.status(400).json({ error: 'Path is required' });
            return;
        }

        try {
            const repository = await host.addRepository(repoPath);
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
                logger.error('Failed to add repository', err);
            }
            res.status(status).json({ error: status === 500 ? 'Failed to add repository' : message });
        }
    });

    router.delete('/:id', async (req, res) => {
        try {
            const deleted = await host.removeRepository(req.params.id);
            if (!deleted) {
                res.status(404).json({ error: 'Repository not found' });
                return;
            }
            res.status(204).send();
        } catch (err: unknown) {
            logger.error('Failed to remove repository', err);
            res.status(500).json({ error: 'Failed to remove repository' });
        }
    });

    return router;
}
