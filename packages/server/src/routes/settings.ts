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
    if (devDir === undefined) {
        res.status(400).json({ error: 'devDir is required' });
        return;
    }

    try {
        const settings = await updateSettings({ devDir });
        res.json({ settings });
    } catch (err: unknown) {
        console.error('Failed to save settings', err);
        res.status(500).json({ error: 'Failed to save settings' });
    }
});
