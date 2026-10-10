import type { PtyLaunch } from '@core/libs/process/resolveCommand.js';

/** Resolve the interactive login shell for the built-in session terminal. */
export function resolveUserShell(platform: NodeJS.Platform = process.platform): PtyLaunch {
    if (platform === 'win32') {
        const comspec = process.env.ComSpec?.trim();
        return { file: comspec && comspec.length > 0 ? comspec : 'cmd.exe', args: [] };
    }

    const shell = process.env.SHELL?.trim();
    return { file: shell && shell.length > 0 ? shell : '/bin/bash', args: [] };
}
