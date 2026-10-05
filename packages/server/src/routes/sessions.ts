import { isAgentId } from '@server/libs/agents/agents.js';
import {
    createSession,
    deleteSession,
    getSession,
    getSessionDiff,
    getSessionDiffFile,
    listSessions,
} from '@server/libs/sessions/store.js';
import { Router } from 'express';

export const sessionsRouter = Router();

sessionsRouter.get('/', (req, res) => {
    const repositoryId = typeof req.query.repositoryId === 'string' ? req.query.repositoryId.trim() : '';
    const sessions = listSessions(repositoryId || undefined);
    res.json({ sessions });
});

sessionsRouter.get('/:id/diff', async (req, res) => {
    try {
        const diff = await getSessionDiff(req.params.id);
        if (!diff) {
            res.status(404).json({ error: 'Session not found' });
            return;
        }
        res.json({ diff });
    } catch (err: unknown) {
        console.error('Failed to load session diff', err);
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
        console.error('Failed to load session file diff', err);
        res.status(500).json({ error: 'Failed to load file diff' });
    }
});

sessionsRouter.get('/:id', (req, res) => {
    const session = getSession(req.params.id);
    if (!session) {
        res.status(404).json({ error: 'Session not found' });
        return;
    }
    res.json({ session });
});

sessionsRouter.delete('/:id', (req, res) => {
    const deleted = deleteSession(req.params.id);
    if (!deleted) {
        res.status(404).json({ error: 'Session not found' });
        return;
    }
    res.status(204).send();
});

sessionsRouter.post('/', async (req, res) => {
    const repositoryId = typeof req.body?.repositoryId === 'string' ? req.body.repositoryId.trim() : '';
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const branch = typeof req.body?.branch === 'string' ? req.body.branch.trim() : '';
    const agent = req.body?.agent;
    const yoloMode = typeof req.body?.yoloMode === 'boolean' ? req.body.yoloMode : false;

    if (!repositoryId) {
        res.status(400).json({ error: 'Repository is required' });
        return;
    }
    if (!name) {
        res.status(400).json({ error: 'Name is required' });
        return;
    }
    if (!isAgentId(agent)) {
        res.status(400).json({ error: 'Invalid agent' });
        return;
    }

    try {
        const session = await createSession({
            repositoryId,
            name,
            agent,
            yoloMode,
            ...(branch ? { branch } : {}),
        });
        res.status(201).json({ session });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to create session';
        const status =
            message === 'Name is required' ||
            message === 'Repository not found' ||
            message.startsWith('Failed to create worktree')
                ? 400
                : 500;
        if (status === 500) {
            console.error('Failed to create session', err);
        }
        res.status(status).json({ error: status === 500 ? 'Failed to create session' : message });
    }
});
