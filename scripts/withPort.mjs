import { spawn } from 'node:child_process';

/**
 * Apply port overrides, then run the remaining command.
 *
 * Preferred (no npm warnings):
 *   npm run dev -- --PORT=8080
 *   npm run start -- --PORT=8080 --SERVER_PORT=3001
 *
 * Also supported:
 *   PORT=8080 SERVER_PORT=3001 npm run dev
 *
 * PORT        — UI / Vite listen port (what you open in the browser)
 * SERVER_PORT — API server listen port
 */

const NPM_CONFIG_PORT_KEYS = ['npm_config_port', 'npm_config_server_port'];

function takeArgValue(args, names) {
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        for (const name of names) {
            if (arg === name && i + 1 < args.length) {
                const value = args[i + 1];
                args.splice(i, 2);
                return value;
            }
            if (arg.startsWith(`${name}=`)) {
                const value = arg.slice(name.length + 1);
                args.splice(i, 1);
                return value;
            }
        }
    }
    return undefined;
}

const args = process.argv.slice(2);
const portFromArgs = takeArgValue(args, ['--PORT', '--port']);
const serverPortFromArgs = takeArgValue(args, ['--SERVER_PORT', '--server-port']);

if (portFromArgs && !process.env.PORT) {
    process.env.PORT = portFromArgs;
}
if (serverPortFromArgs && !process.env.SERVER_PORT) {
    process.env.SERVER_PORT = serverPortFromArgs;
}

if (process.env.npm_config_port && !process.env.PORT) {
    process.env.PORT = process.env.npm_config_port;
}
if (process.env.npm_config_server_port && !process.env.SERVER_PORT) {
    process.env.SERVER_PORT = process.env.npm_config_server_port;
}

// Drop npm's config env so nested `npm run` calls do not warn about unknown configs.
for (const key of NPM_CONFIG_PORT_KEYS) {
    delete process.env[key];
}

const [command, ...commandArgs] = args;
if (!command) {
    console.error('withPort: missing command');
    process.exit(1);
}

const child = spawn(command, commandArgs, {
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
