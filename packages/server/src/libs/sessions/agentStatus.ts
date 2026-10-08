import { logger } from '@server/libs/logger.js';
import type { SessionStatus } from '@server/libs/sessions/types.js';
import { readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

/** OSC 0 window titles written by Cursor agent when status indicators are enabled. */
const OSC_TITLE_RE = /\u001b\]0;([^\u0007\u001b]*)(?:\u0007|\u001b\\)/g;

const READY_TITLE_RE = /\b(ready|waiting for you|waiting for confirmation)\b/i;
const BUSY_TITLE_RE = /\b(working|queued|planning|running|loading|reconnecting|moving to cloud|reviewing|starting)\b/i;
const BRAILLE_RE = /[\u2800-\u28FF]/;

/**
 * Ensure Cursor CLI writes Working/Ready titles to the PTY (OSC 0).
 * Tether uses those titles for the session status indicator.
 */
export async function ensureCursorStatusIndicatorsEnabled(): Promise<void> {
    const configPath = path.join(os.homedir(), '.cursor', 'cli-config.json');
    try {
        const raw = await readFile(configPath, 'utf8');
        const config = JSON.parse(raw) as {
            display?: Record<string, unknown>;
            [key: string]: unknown;
        };
        if (config.display?.showStatusIndicators === true) {
            return;
        }
        config.display = { ...config.display, showStatusIndicators: true };
        await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
    } catch (err: unknown) {
        // Missing or invalid config — write a minimal override so new sessions still get titles.
        if ((err as NodeJS.ErrnoException)?.code === 'ENOENT') {
            await writeFile(
                configPath,
                `${JSON.stringify({ version: 1, display: { showStatusIndicators: true } }, null, 2)}\n`,
                'utf8',
            );
            return;
        }
        logger.error('Failed to enable Cursor status indicators', err);
    }
}

export function statusFromTerminalTitle(title: string): SessionStatus | null {
    const leaf = title.includes(' - ') ? title.slice(title.lastIndexOf(' - ') + 3).trim() : title.trim();
    if (!leaf) return null;

    // Ready / waiting-for-user come before busy checks so "Waiting for you" wins.
    if (READY_TITLE_RE.test(leaf)) {
        return 'ready';
    }
    if (BUSY_TITLE_RE.test(leaf) || BRAILLE_RE.test(leaf)) {
        return 'busy';
    }
    return null;
}

export type OscTitleParseState = {
    /** Incomplete OSC 0 sequence carried across PTY chunks. */
    pending: string;
};

/** Returns the latest agent status encoded in OSC titles within a PTY chunk, if any. */
export function extractStatusFromOutput(chunk: string, state: OscTitleParseState): SessionStatus | null {
    const combined = state.pending + chunk;
    state.pending = '';

    let latest: SessionStatus | null = null;
    let lastIndex = 0;
    for (const match of combined.matchAll(OSC_TITLE_RE)) {
        const status = statusFromTerminalTitle(match[1] ?? '');
        if (status) {
            latest = status;
        }
        lastIndex = (match.index ?? 0) + match[0].length;
    }

    // Keep a trailing partial OSC 0 so split chunks still parse.
    const remainder = combined.slice(lastIndex);
    const partialAt = remainder.lastIndexOf('\u001b]0;');
    if (partialAt >= 0) {
        state.pending = remainder.slice(partialAt);
    }

    return latest;
}
