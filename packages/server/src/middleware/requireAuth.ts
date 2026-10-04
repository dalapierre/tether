import { verifyAccessToken } from '@server/libs/authTokens.js';
import type { NextFunction, Request, Response } from 'express';

function extractBearerToken(header: string | undefined): string | null {
    if (!header) return null;
    const [scheme, token] = header.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
    return token;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
    const token = extractBearerToken(req.header('authorization'));
    if (!token || !verifyAccessToken(token)) {
        res.status(403).json({ error: 'Forbidden' });
        return;
    }
    next();
}
