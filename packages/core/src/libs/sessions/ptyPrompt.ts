import type { IPty } from 'node-pty';

/** Quote a single argv token for a POSIX-ish interactive shell. */
export function quoteShellArg(arg: string): string {
    if (arg.length === 0) return "''";
    if (/^[A-Za-z0-9_./:=+-]+$/.test(arg)) return arg;
    return `'${arg.replace(/'/g, `'\\''`)}'`;
}

/** Join command + args into a line safe to write into an interactive shell. */
export function formatShellCommand(command: string, args: string[]): string {
    return [command, ...args].map(quoteShellArg).join(' ');
}

/**
 * Insert a full prompt into a PTY and submit it.
 * Bulk writes are often treated as a paste; a trailing CR in the same write
 * can land inside that paste and never submit. Bracket the text, then send
 * Enter on a short delay so it is a real keypress.
 */
export function writePtyPromptAndSubmit(term: IPty, text: string): void {
    const trimmed = text.trim();
    if (!trimmed) return;

    const BRACKETED_PASTE_START = '\x1b[200~';
    const BRACKETED_PASTE_END = '\x1b[201~';
    term.write(`${BRACKETED_PASTE_START}${trimmed}${BRACKETED_PASTE_END}`);

    const gapMs = Math.min(1000, Math.max(50, Math.ceil(trimmed.length / 40)));
    setTimeout(() => {
        try {
            term.write('\r');
        } catch {
            // pty may have exited before submit
        }
    }, gapMs);
}
