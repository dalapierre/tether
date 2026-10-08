import { createAccessToken, isAccessKeyConfigured, validateAccessKey } from '@server/libs/authTokens.js';
import { Router } from 'express';

export const authRouter = Router();

authRouter.post('/login', async (req, res) => {
    if (!isAccessKeyConfigured()) {
        res.status(503).json({ error: 'ACCESS_KEY is not configured on the server' });
        return;
    }

    const accessKey = typeof req.body?.accessKey === 'string' ? req.body.accessKey : '';
    if (!accessKey || !validateAccessKey(accessKey)) {
        res.status(401).json({ error: 'Invalid access key' });
        return;
    }

    try {
        const { token, expiresAt } = await createAccessToken();
        res.json({ token, expiresAt });
    } catch (err: unknown) {
        console.error('Failed to create access token', err);
        res.status(500).json({ error: 'Failed to create access token' });
    }
});
