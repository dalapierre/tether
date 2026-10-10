import { logger } from '@tether/core';
import type { Express } from 'express';
import express from 'express';
import fs from 'node:fs/promises';
import type { Server as HttpServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ViteDevServer } from 'vite';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export type UiServeHandle = {
    vite: ViteDevServer | null;
};

/**
 * Serve the host-owned UI on the same Express app / HTTP server as the API.
 * Dev: Vite middleware mode (HMR on the host port).
 * Prod: static assets from dist/ui.
 */
export async function serveUi(app: Express, server: HttpServer, isDev: boolean): Promise<UiServeHandle> {
    if (isDev) {
        const { createServer: createViteServer } = await import('vite');
        const vite = await createViteServer({
            configFile: path.join(packageRoot, 'vite.config.ts'),
            server: {
                middlewareMode: true,
                hmr: { server },
            },
            appType: 'custom',
        });

        app.use(vite.middlewares);

        app.use(async (req, res, next) => {
            if (req.method !== 'GET' && req.method !== 'HEAD') {
                next();
                return;
            }
            const url = req.originalUrl;
            if (url.startsWith('/api')) {
                next();
                return;
            }

            try {
                // HTML lives next to UI sources (Vite/Tailwind root); host builds and serves it.
                const templatePath = path.join(packageRoot, '../ui/index.html');
                let template = await fs.readFile(templatePath, 'utf-8');
                template = await vite.transformIndexHtml(url, template);
                res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
            } catch (err: unknown) {
                vite.ssrFixStacktrace(err as Error);
                next(err);
            }
        });

        logger.info('UI served via Vite middleware (dev)');
        return { vite };
    }

    const uiDist = path.join(packageRoot, 'dist/ui');
    app.use(express.static(uiDist, { index: false }));

    app.use(async (req, res, next) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') {
            next();
            return;
        }
        if (req.originalUrl.startsWith('/api')) {
            next();
            return;
        }

        try {
            const indexHtml = await fs.readFile(path.join(uiDist, 'index.html'), 'utf-8');
            res.status(200).set({ 'Content-Type': 'text/html' }).end(indexHtml);
        } catch (err: unknown) {
            next(err);
        }
    });

    logger.info(`UI served from ${uiDist}`);
    return { vite: null };
}
