import { isAgentId } from '@server/libs/agents/agents.js';
import { getSettings, updateSettings } from '@server/libs/settings/store.js';
import { Router } from 'express';

export const settingsRouter = Router();

settingsRouter.get('/', async (_req, res) => {
    try {
        const settings = await getSettings();
        res.json({ settings });
    } catch (err: unknown) {
        console.error('Failed to load settings', err);
        res.status(500).json({ error: 'Failed to load settings' });
    }
});

settingsRouter.put('/', async (req, res) => {
    const devDir = typeof req.body?.devDir === 'string' ? req.body.devDir.trim() : undefined;
    const agentRaw = typeof req.body?.agent === 'string' ? req.body.agent.trim() : undefined;

    if (devDir === undefined) {
        res.status(400).json({ error: 'devDir is required' });
        return;
    }

    if (agentRaw === undefined) {
        res.status(400).json({ error: 'agent is required' });
        return;
    }

    if (!isAgentId(agentRaw)) {
        res.status(400).json({ error: 'Unsupported agent' });
        return;
    }

    try {
        const settings = await updateSettings({ devDir, agent: agentRaw });
        res.json({ settings });
    } catch (err: unknown) {
        console.error('Failed to save settings', err);
        res.status(500).json({ error: 'Failed to save settings' });
    }
});
