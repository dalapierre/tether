import { getSettings, normalizeIncomingProfiles, updateSettings } from '@server/libs/settings/store.js';
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
    const defaultProfileId =
        typeof req.body?.defaultProfileId === 'string' ? req.body.defaultProfileId.trim() : undefined;
    const profiles = normalizeIncomingProfiles(req.body?.profiles);

    if (devDir === undefined) {
        res.status(400).json({ error: 'devDir is required' });
        return;
    }

    if (defaultProfileId === undefined) {
        res.status(400).json({ error: 'defaultProfileId is required' });
        return;
    }

    if (!profiles) {
        res.status(400).json({ error: 'profiles must be a non-empty array of valid profiles' });
        return;
    }

    if (!profiles.some((profile) => profile.id === defaultProfileId)) {
        res.status(400).json({ error: 'defaultProfileId must match a profile' });
        return;
    }

    try {
        const settings = await updateSettings({ devDir, defaultProfileId, profiles });
        res.json({ settings });
    } catch (err: unknown) {
        console.error('Failed to save settings', err);
        res.status(500).json({ error: 'Failed to save settings' });
    }
});
