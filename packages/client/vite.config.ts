import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: {
            '@client': path.resolve(root, 'src'),
        },
    },
    server: {
        host: true,
        port: 8080,
        proxy: {
            '/api': {
                target: 'http://localhost:3001',
                changeOrigin: true,
            },
        },
    },
});
