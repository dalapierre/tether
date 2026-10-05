import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

const root = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(root, '../..');

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, repoRoot, '');
    const overNetwork = env.OVER_NETWORK === 'true';

    return {
        plugins: [react(), tailwindcss()],
        resolve: {
            alias: {
                '@client': path.resolve(root, 'src'),
            },
        },
        envDir: repoRoot,
        server: {
            host: overNetwork ? true : '127.0.0.1',
            port: 8080,
            proxy: {
                '/api': {
                    target: 'http://localhost:3001',
                    changeOrigin: true,
                    ws: true,
                },
            },
        },
    };
});
