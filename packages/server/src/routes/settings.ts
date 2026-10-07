import { isAgentId } from '@server/libs/agents/agents.js';
import { isKeybinds, normalizeKeybinds } from '@server/libs/settings/keybinds.js';
import {
    getSettings,
    MAX_TOAST_DURATION_SECONDS,
    MIN_TOAST_DURATION_SECONDS,
    normalizeIncomingProfiles,
    normalizeToastDurationSeconds,
    updateSettings,
} from '@server/libs/settings/store.js';
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
    const toastDurationRaw = req.body?.toastDurationSeconds;
    const defaultAgentRaw = typeof req.body?.defaultAgent === 'string' ? req.body.defaultAgent.trim() : undefined;
    const defaultProfileId =
        typeof req.body?.defaultProfileId === 'string' ? req.body.defaultProfileId.trim() : undefined;
    const profiles = normalizeIncomingProfiles(req.body?.profiles);
    const keybindsRaw = req.body?.keybinds;

    if (devDir === undefined) {
        res.status(400).json({ error: 'devDir is required' });
        return;
    }

    if (typeof toastDurationRaw !== 'number' || !Number.isFinite(toastDurationRaw)) {
        res.status(400).json({ error: 'toastDurationSeconds is required' });
        return;
    }

    const toastDurationSeconds = Math.round(toastDurationRaw);
    if (toastDurationSeconds < MIN_TOAST_DURATION_SECONDS || toastDurationSeconds > MAX_TOAST_DURATION_SECONDS) {
        res.status(400).json({
            error: `toastDurationSeconds must be between ${MIN_TOAST_DURATION_SECONDS} and ${MAX_TOAST_DURATION_SECONDS}`,
        });
        return;
    }

    if (defaultAgentRaw === undefined) {
        res.status(400).json({ error: 'defaultAgent is required' });
        return;
    }

    if (!isAgentId(defaultAgentRaw)) {
        res.status(400).json({ error: 'defaultAgent must be a supported harness' });
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

    if (keybindsRaw !== undefined && !isKeybinds(keybindsRaw)) {
        res.status(400).json({ error: 'keybinds must include home and session' });
        return;
    }

    try {
        const settings = await updateSettings({
            devDir,
            toastDurationSeconds: normalizeToastDurationSeconds(toastDurationSeconds),
            defaultAgent: defaultAgentRaw,
            defaultProfileId,
            profiles,
            keybinds: keybindsRaw !== undefined ? normalizeKeybinds(keybindsRaw) : undefined,
        });
        res.json({ settings });
    } catch (err: unknown) {
        console.error('Failed to save settings', err);
        res.status(500).json({ error: 'Failed to save settings' });
    }
});
