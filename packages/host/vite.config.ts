import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

const hostRoot = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(hostRoot, '../..');
const uiRoot = path.resolve(hostRoot, '../ui');

/**
 * Vite root is packages/ui so Tailwind v4 scans the same sources as the old
 * client app. Host owns the Vite config and serves the built UI — @tether/ui
 * has no dev/start scripts of its own.
 */
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, repoRoot, '');
    const port = Number(process.env.PORT || process.env.SERVER_PORT || env.PORT || env.SERVER_PORT) || 1928;

    return {
        root: uiRoot,
        plugins: [
            react(),
            tailwindcss(),
            {
                name: 'codicon-font-display-swap',
                enforce: 'pre',
                transform(code, id) {
                    if (id.replace(/\\/g, '/').endsWith('/codicon/codicon.css')) {
                        return code.replace('font-display: block', 'font-display: swap');
                    }
                },
            },
        ],
        resolve: {
            alias: {
                '@ui': path.resolve(uiRoot, 'src'),
            },
        },
        envDir: repoRoot,
        server: {
            middlewareMode: true,
            fs: {
                allow: [repoRoot],
            },
        },
        appType: 'custom',
        build: {
            outDir: path.resolve(hostRoot, 'dist/ui'),
            emptyOutDir: true,
            rollupOptions: {
                input: path.resolve(uiRoot, 'index.html'),
                output: {
                    manualChunks(id) {
                        const normalized = id.replace(/\\/g, '/');
                        if (
                            normalized.includes('/node_modules/react/') ||
                            normalized.includes('/node_modules/react-dom/') ||
                            normalized.includes('/node_modules/scheduler/')
                        ) {
                            return 'react-vendor';
                        }
                        if (normalized.includes('/@xterm/')) {
                            return 'xterm';
                        }
                        if (
                            normalized.includes('/react-markdown/') ||
                            normalized.includes('/remark-') ||
                            normalized.includes('/micromark') ||
                            normalized.includes('/mdast-') ||
                            normalized.includes('/unist-') ||
                            normalized.includes('/unified/')
                        ) {
                            return 'markdown';
                        }
                    },
                },
            },
        },
        preview: { port },
    };
});
