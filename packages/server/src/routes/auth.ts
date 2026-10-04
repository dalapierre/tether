import { createAccessToken, isAccessKeyConfigured, validateAccessKey } from '@server/libs/auth_tokens.js';
import { Router } from 'express';

export const authRouter = Router();

authRouter.post('/login', (req, res) => {
    if (!isAccessKeyConfigured()) {
        res.status(503).json({ error: 'ACCESS_KEY is not configured on the server' });
        return;
    }

    const accessKey = typeof req.body?.accessKey === 'string' ? req.body.accessKey : '';
    if (!accessKey || !validateAccessKey(accessKey)) {
        res.status(401).json({ error: 'Invalid access key' });
        return;
    }

    const { token, expiresAt } = createAccessToken();
    res.json({ token, expiresAt });
});
