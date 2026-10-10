import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

const root = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(root, '../..');

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, repoRoot, '');
    const clientPort = Number(process.env.PORT || process.env.npm_config_port || env.PORT) || 1111;
    const serverPort = Number(process.env.SERVER_PORT || process.env.npm_config_server_port || env.SERVER_PORT) || 1928;
    const sharedServer = {
        host: true,
        port: clientPort,
        proxy: {
            '/api': {
                target: `http://localhost:${serverPort}`,
                changeOrigin: true,
                ws: true,
                configure: (proxy) => {
                    proxy.on('error', (err) => {
                        const code = (err as NodeJS.ErrnoException).code;
                        // Client/HMR closes mid-write; noisy but harmless in dev.
                        if (code === 'EPIPE' || code === 'ECONNRESET') return;
                        console.error('[vite] api proxy error:', err);
                    });
                },
            },
        },
    };

    return {
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
                '@client': path.resolve(root, 'src'),
            },
        },
        envDir: repoRoot,
        server: sharedServer,
        preview: sharedServer,
        build: {
            rollupOptions: {
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
    };
});
