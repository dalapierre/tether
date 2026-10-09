import { logger } from '@server/libs/logger.js';
import {
    createSession,
    deleteSession,
    discardSessionFileChange,
    getSession,
    getSessionDiff,
    getSessionDiffFile,
    killSessionShell,
    listSessions,
    restartSession,
} from '@server/libs/sessions/store.js';
import { Router } from 'express';

export const sessionsRouter = Router();

sessionsRouter.get('/', async (req, res) => {
    const repositoryId = typeof req.query.repositoryId === 'string' ? req.query.repositoryId.trim() : '';
    try {
        const sessions = await listSessions(repositoryId || undefined);
        res.json({ sessions });
    } catch (err: unknown) {
        logger.error('Failed to list sessions', err);
        res.status(500).json({ error: 'Failed to list sessions' });
    }
});

sessionsRouter.get('/:id/diff', async (req, res) => {
    try {
        const result = await getSessionDiff(req.params.id);
        if (!result) {
            res.status(404).json({ error: 'Session not found' });
            return;
        }
        res.json({ diff: result.diff, pending: result.pending });
    } catch (err: unknown) {
        logger.error('Failed to load session diff', err);
        res.status(500).json({ error: 'Failed to load session diff' });
    }
});

sessionsRouter.get('/:id/diff/file', async (req, res) => {
    const filePath = typeof req.query.path === 'string' ? req.query.path.trim() : '';
    if (!filePath) {
        res.status(400).json({ error: 'Path is required' });
        return;
    }

    try {
        const file = await getSessionDiffFile(req.params.id, filePath);
        if (!file) {
            res.status(404).json({ error: 'Session not found' });
            return;
        }
        res.json({ file });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load file diff';
        if (message === 'Invalid path' || message === 'File not found in diff') {
            res.status(400).json({ error: message });
            return;
        }
        logger.error('Failed to load session file diff', err);
        res.status(500).json({ error: 'Failed to load file diff' });
    }
});

sessionsRouter.post('/:id/diff/discard', async (req, res) => {
    const filePath = typeof req.body?.path === 'string' ? req.body.path.trim() : '';
    if (!filePath) {
        res.status(400).json({ error: 'Path is required' });
        return;
    }

    try {
        const ok = await discardSessionFileChange(req.params.id, filePath);
        if (!ok) {
            res.status(404).json({ error: 'Session not found' });
            return;
        }
        res.status(204).send();
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to discard file change';
        if (message === 'Invalid path' || message === 'File not found in diff') {
            res.status(400).json({ error: message });
            return;
        }
        logger.error('Failed to discard session file change', err);
        res.status(500).json({ error: 'Failed to discard file change' });
    }
});

sessionsRouter.get('/:id', async (req, res) => {
    try {
        const session = await getSession(req.params.id);
        if (!session) {
            res.status(404).json({ error: 'Session not found' });
            return;
        }
        res.json({ session });
    } catch (err: unknown) {
        logger.error('Failed to get session', err);
        res.status(500).json({ error: 'Failed to get session' });
    }
});

sessionsRouter.delete('/:id/shell', (req, res) => {
    const killed = killSessionShell(req.params.id);
    if (!killed) {
        res.status(404).json({ error: 'Session not found' });
        return;
    }
    res.status(204).send();
});

sessionsRouter.delete('/:id', (req, res) => {
    const deleted = deleteSession(req.params.id);
    if (!deleted) {
        res.status(404).json({ error: 'Session not found' });
        return;
    }
    res.status(204).send();
});

sessionsRouter.post('/:id/restart', async (req, res) => {
    try {
        const session = await restartSession(req.params.id);
        if (!session) {
            res.status(404).json({ error: 'Session not found' });
            return;
        }
        res.json({ session });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to restart session';
        if (message === 'Session is still running' || message === 'Workspace missing') {
            res.status(400).json({ error: message });
            return;
        }
        logger.error('Failed to restart session', err);
        res.status(500).json({ error: 'Failed to restart session' });
    }
});

sessionsRouter.post('/', async (req, res) => {
    const profileId = typeof req.body?.profileId === 'string' ? req.body.profileId.trim() : '';
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const repositoryId = typeof req.body?.repositoryId === 'string' ? req.body.repositoryId.trim() : '';
    const branch = typeof req.body?.branch === 'string' ? req.body.branch.trim() : '';
    const workingDirectory = typeof req.body?.workingDirectory === 'string' ? req.body.workingDirectory.trim() : '';

    if (!profileId) {
        res.status(400).json({ error: 'Profile is required' });
        return;
    }
    if (!name) {
        res.status(400).json({ error: 'Name is required' });
        return;
    }

    try {
        const session = await createSession({
            profileId,
            name,
            repositoryId: repositoryId || undefined,
            branch: branch || undefined,
            workingDirectory: workingDirectory || undefined,
        });
        res.status(201).json({ session });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to create session';
        const status =
            message === 'Name is required' ||
            message === 'Branch is required' ||
            message === 'Repository is required' ||
            message === 'Repository not found' ||
            message === 'Profile not found' ||
            message === 'Invalid working directory' ||
            message === 'Working directory not found' ||
            message.startsWith('Failed to create worktree')
                ? 400
                : 500;
        if (status === 500) {
            logger.error('Failed to create session', err);
        }
        res.status(status).json({ error: status === 500 ? 'Failed to create session' : message });
    }
});
