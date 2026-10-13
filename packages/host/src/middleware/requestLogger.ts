import { errors, logger, sanitizeUrl } from '@tether/core';
import type { NextFunction, Request, Response } from 'express';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
    const startedAt = Date.now();
    const url = sanitizeUrl(req.originalUrl);
    logger.info(`${req.method} ${url}`);

    res.on('finish', () => {
        const durationMs = Date.now() - startedAt;
        const { statusCode } = res;
        const message = `${req.method} ${url} → ${statusCode} (${durationMs}ms)`;
        if (statusCode >= 500) {
            logger.error(errors.httpRequestServerError, {
                method: req.method,
                url,
                statusCode,
                durationMs,
            });
            return;
        }
        if (statusCode >= 400) {
            logger.warn(message);
            return;
        }
        logger.info(message);
    });

    next();
}
