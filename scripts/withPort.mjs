import { spawn } from 'node:child_process';

/**
 * Hoist npm CLI config flags into normal env vars.
 *
 *   npm run dev --PORT=8080
 *   npm run start --SERVER_PORT=3001
 *
 * PORT        — UI / Vite listen port (what you open in the browser)
 * SERVER_PORT — API server listen port
 * CLIENT_PORT — back-compat alias for PORT
 */
if (process.env.npm_config_port && !process.env.PORT) {
    process.env.PORT = process.env.npm_config_port;
}
if (process.env.npm_config_server_port && !process.env.SERVER_PORT) {
    process.env.SERVER_PORT = process.env.npm_config_server_port;
}
if (!process.env.PORT && (process.env.CLIENT_PORT || process.env.npm_config_client_port)) {
    process.env.PORT = process.env.CLIENT_PORT || process.env.npm_config_client_port;
}

const [command, ...args] = process.argv.slice(2);
if (!command) {
    console.error('withPort: missing command');
    process.exit(1);
}

const child = spawn(command, args, {
    stdio: 'inherit',
    env: process.env,
});

child.on('exit', (code, signal) => {
    if (signal) {
        process.kill(process.pid, signal);
        return;
    }
    process.exit(code ?? 1);
});
