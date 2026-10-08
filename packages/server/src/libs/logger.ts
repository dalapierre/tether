type LogLevel = 'INFO' | 'WARN' | 'ERROR';

const RESET = '\x1b[0m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';

function timestamp(): string {
    return new Date().toISOString();
}

function formatLevel(level: LogLevel): string {
    const label = `[${level}]`;
    if (level === 'WARN') {
        return `${YELLOW}${label}${RESET}`;
    }
    if (level === 'ERROR') {
        return `${RED}${label}${RESET}`;
    }
    return label;
}

function write(level: LogLevel, message: string, err?: unknown): void {
    const line = `${timestamp()} ${formatLevel(level)} ${message}`;

    if (level === 'ERROR') {
        console.error(line);
        if (err === undefined) {
            return;
        }
        if (err instanceof Error) {
            console.error(err.stack ?? `${err.name}: ${err.message}`);
            return;
        }
        console.error(err);
        return;
    }

    if (level === 'WARN') {
        console.warn(line);
        return;
    }

    console.log(line);
}

export const logger = {
    info(message: string): void {
        write('INFO', message);
    },
    warn(message: string): void {
        write('WARN', message);
    },
    error(message: string, err?: unknown): void {
        write('ERROR', message, err);
    },
};
