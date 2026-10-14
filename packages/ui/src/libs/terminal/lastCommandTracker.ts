/**
 * Best-effort reconstruction of the last shell line submitted with Enter.
 * Tracks local keystrokes only — history recall / remote echo are not mirrored.
 */
export function createLastCommandTracker(): {
    pushInput: (data: string) => void;
    getLastCommand: () => string;
} {
    let line = '';
    let lastCommand = '';

    function pushInput(data: string): void {
        for (const char of data) {
            if (char === '\r' || char === '\n') {
                const trimmed = line.trim();
                if (trimmed) {
                    lastCommand = trimmed;
                }
                line = '';
                continue;
            }
            if (char === '\x7f' || char === '\b') {
                line = line.slice(0, -1);
                continue;
            }
            if (char === '\x15') {
                // Ctrl+U — discard the current line.
                line = '';
                continue;
            }
            if (char === '\x03') {
                // Ctrl+C — abort the current line.
                line = '';
                continue;
            }
            // Ignore other control characters; keep printable input.
            if (char < ' ' || char === '\x7f') {
                continue;
            }
            line += char;
        }
    }

    return {
        pushInput,
        getLastCommand: () => lastCommand,
    };
}
