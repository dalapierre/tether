import { access, stat } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import path from 'node:path';

const WINDOWS_EXECUTABLE_EXTENSIONS = ['.exe', '.com'] as const;
const WINDOWS_BATCH_EXTENSIONS = ['.cmd', '.bat'] as const;

/** Launch descriptor for node-pty. On Windows, `args` may be a raw command-line string. */
export type PtyLaunch = {
    file: string;
    args: string[] | string;
};

export type ResolveCommandOptions = {
    platform?: NodeJS.Platform;
    searchPath?: string;
    comspec?: string;
    /** Override filesystem checks (used for tests / cross-host simulation). */
    fileExists?: (candidate: string) => boolean | Promise<boolean>;
};

/** True when `bin` is already a path (absolute or relative), not a bare PATH command name. */
export function namesAPath(bin: string): boolean {
    return bin.includes('/') || bin.includes('\\');
}

function endsWithExtension(bin: string, extensions: readonly string[]): boolean {
    const lower = bin.toLowerCase();
    return extensions.some((ext) => lower.endsWith(ext));
}

async function isFile(candidate: string): Promise<boolean> {
    try {
        const info = await stat(candidate);
        return info.isFile();
    } catch {
        return false;
    }
}

async function isRunnableUnix(candidate: string): Promise<boolean> {
    try {
        await access(candidate, fsConstants.X_OK);
        const info = await stat(candidate);
        return info.isFile();
    } catch {
        return false;
    }
}

/** PATH entries, stripping optional surrounding quotes used on Windows. */
export function searchPathDirectories(searchPath: string | undefined, delimiter = path.delimiter): string[] {
    return (searchPath ?? '')
        .split(delimiter)
        .map((entry) => entry.replace(/^"(.*)"$/, '$1'))
        .filter((entry) => entry !== '');
}

async function firstExisting(
    candidates: string[],
    exists: (candidate: string) => boolean | Promise<boolean>,
): Promise<string | null> {
    for (const candidate of candidates) {
        if (await exists(candidate)) {
            return candidate;
        }
    }
    return null;
}

/**
 * Find `bin` on PATH.
 * On Windows: prefer `.exe`/`.com` across the whole PATH, then `.cmd`/`.bat` (not cmd.exe's
 * per-directory order — keeps a working .exe spawn off the batch/quoting path).
 * On Unix: the bare name with execute permission.
 */
export async function findCommandOnPath(bin: string, options: ResolveCommandOptions = {}): Promise<string | null> {
    const platform = options.platform ?? process.platform;
    const searchPath = options.searchPath ?? process.env.PATH;
    const fileExists = options.fileExists ?? isFile;

    if (!bin) {
        return null;
    }

    if (namesAPath(bin)) {
        if (platform === 'win32') {
            return (await fileExists(bin)) ? bin : null;
        }
        if (options.fileExists) {
            return (await options.fileExists(bin)) ? bin : null;
        }
        return (await isRunnableUnix(bin)) ? bin : null;
    }

    const dirs = searchPathDirectories(searchPath, platform === 'win32' ? ';' : path.delimiter);

    if (platform === 'win32') {
        const join = path.win32.join;
        if (endsWithExtension(bin, WINDOWS_EXECUTABLE_EXTENSIONS) || endsWithExtension(bin, WINDOWS_BATCH_EXTENSIONS)) {
            return firstExisting(
                dirs.map((dir) => join(dir, bin)),
                fileExists,
            );
        }

        const executables = dirs.flatMap((dir) => WINDOWS_EXECUTABLE_EXTENSIONS.map((ext) => join(dir, bin + ext)));
        const executable = await firstExisting(executables, fileExists);
        if (executable) {
            return executable;
        }

        const batches = dirs.flatMap((dir) => WINDOWS_BATCH_EXTENSIONS.map((ext) => join(dir, bin + ext)));
        return firstExisting(batches, fileExists);
    }

    const unixExists = options.fileExists ?? isRunnableUnix;
    return firstExisting(
        dirs.map((dir) => path.join(dir, bin)),
        unixExists,
    );
}

/** Whether `bin` resolves to something spawnable on PATH (or as an explicit path). */
export async function isCommandOnPath(bin: string): Promise<boolean> {
    return (await findCommandOnPath(bin)) != null;
}

/**
 * Quote one argument for cmd.exe. Always quoted so metacharacters stay literal.
 * Internal quotes are doubled; a trailing backslash run is doubled so the CRT does not
 * treat them as escaping the closing quote.
 */
export function escapeBatchArgument(arg: string): string {
    if (/[\0\r\n]/.test(arg)) {
        throw new Error(`argument contains a NUL, CR or LF: ${JSON.stringify(arg)}`);
    }
    const quotesDoubled = arg.replace(/"/g, '""');
    let trailing = 0;
    for (let i = quotesDoubled.length - 1; i >= 0 && quotesDoubled[i] === '\\'; i -= 1) {
        trailing += 1;
    }
    return `"${quotesDoubled}${'\\'.repeat(trailing)}"`;
}

/** Everything after cmd.exe for running `batchPath args…` (`/d /s /c "…"`). */
export function batchCommandLine(batchPath: string, args: readonly string[]): string {
    const command = [escapeBatchArgument(batchPath), ...args.map(escapeBatchArgument)].join(' ');
    return `/d /s /c "${command}"`;
}

async function resolveCommandProcessor(
    comspec: string | undefined,
    searchPath: string | undefined,
    fileExists: (candidate: string) => boolean | Promise<boolean>,
): Promise<string> {
    if (comspec && namesAPath(comspec) && (await fileExists(comspec))) {
        return comspec;
    }
    return (
        (await findCommandOnPath('cmd.exe', {
            platform: 'win32',
            searchPath,
            fileExists,
        })) ?? 'cmd.exe'
    );
}

/**
 * Resolve how to hand `bin` + `args` to node-pty.
 * Windows: absolute `.exe`/`.com`, or cmd.exe wrapping a `.cmd`/`.bat` shim.
 * Unix/macOS: absolute path when found on PATH, otherwise the bare name.
 */
export async function resolvePtyLaunch(
    bin: string,
    args: string[],
    options: ResolveCommandOptions = {},
): Promise<PtyLaunch> {
    const platform = options.platform ?? process.platform;
    const searchPath = options.searchPath ?? process.env.PATH;
    const comspec = options.comspec ?? process.env.ComSpec;
    const fileExists = options.fileExists ?? isFile;

    if (platform !== 'win32') {
        const resolved = await findCommandOnPath(bin, { ...options, platform, searchPath });
        return { file: resolved ?? bin, args };
    }

    if (namesAPath(bin)) {
        if (!endsWithExtension(bin, WINDOWS_BATCH_EXTENSIONS)) {
            return { file: bin, args };
        }
        return {
            file: await resolveCommandProcessor(comspec, searchPath, fileExists),
            args: batchCommandLine(bin, args),
        };
    }

    const resolved = await findCommandOnPath(bin, {
        platform: 'win32',
        searchPath,
        fileExists,
    });
    if (!resolved) {
        return { file: bin, args };
    }

    if (endsWithExtension(resolved, WINDOWS_BATCH_EXTENSIONS)) {
        return {
            file: await resolveCommandProcessor(comspec, searchPath, fileExists),
            args: batchCommandLine(resolved, args),
        };
    }

    return { file: resolved, args };
}
