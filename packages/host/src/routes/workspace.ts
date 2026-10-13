import type { TetherHost } from '@tether/core';
import { Router } from 'express';

export function createWorkspaceRouter(host: TetherHost): Router {
    const router = Router();

    router.delete('/shell/:shellId', (req, res) => {
        const killed = host.killWorkspaceShell(req.params.shellId);
        if (!killed) {
            res.status(404).json({ error: 'Shell not found' });
            return;
        }
        res.status(204).send();
    });

    router.delete('/shell', (_req, res) => {
        host.killWorkspaceShell();
        res.status(204).send();
    });

    return router;
}
