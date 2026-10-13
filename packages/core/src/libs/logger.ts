import {
    formatCriticalError,
    isCriticalErrorValues,
    type CriticalErrorDefinition,
    type CriticalErrorValues,
} from '@core/libs/errors.js';

type LogLevel = 'INFO' | 'WARN' | 'ERROR';

const RESET = '\x1b[0m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';

/** Strip secrets from query strings before logging. */
export function sanitizeUrl(url: string): string {
    try {
        const parsed = new URL(url, 'http://localhost');
        if (parsed.searchParams.has('token')) {
            parsed.searchParams.set('token', '[redacted]');
        }
        return `${parsed.pathname}${parsed.search}`;
    } catch {
        return url;
    }
}

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

/**
 * Log a catalogued error from `errors` in `errors.ts`.
 * Always pass a catalog entry — do not pass free-form strings.
 */
function logError(definition: CriticalErrorDefinition, values?: CriticalErrorValues, err?: unknown): void;
function logError(definition: CriticalErrorDefinition, err?: unknown): void;
function logError(
    definition: CriticalErrorDefinition,
    valuesOrErr?: CriticalErrorValues | unknown,
    err?: unknown,
): void {
    const hasValues = isCriticalErrorValues(valuesOrErr);
    const values = hasValues ? valuesOrErr : undefined;
    const error = hasValues ? err : valuesOrErr;
    const formatted = formatCriticalError(definition, values, error);
    write('ERROR', `[${formatted.id}] ${formatted.message}`, error);
}

export const logger = {
    info(message: string): void {
        write('INFO', message);
    },
    warn(message: string): void {
        write('WARN', message);
    },
    error: logError,
};
