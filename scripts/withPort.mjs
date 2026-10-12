import { spawn } from 'node:child_process';

/**
 * Apply PORT override, then run the remaining command.
 *
 * Preferred (no npm warnings):
 *   npm run dev -- --PORT=8080
 *
 * Also supported:
 *   PORT=8080 npm run dev
 *
 * PORT — host listen port (UI + API on one port). Used by `npm run dev` only
 * (default 1111). `npm run start` always listens on 1928 in production (no HMR).
 */

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

if (portFromArgs && !process.env.PORT) {
    process.env.PORT = portFromArgs;
}

if (process.env.npm_config_port && !process.env.PORT) {
    process.env.PORT = process.env.npm_config_port;
}

// Drop npm's config env so nested `npm run` calls do not warn about unknown configs.
delete process.env.npm_config_port;

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
