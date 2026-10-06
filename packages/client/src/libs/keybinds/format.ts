import { formatModLabel, formatSuperLabel, parseKeybind } from './chords';

const IS_MAC =
    typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent);

const KEY_LABELS: Record<string, string> = {
    arrowup: '↑',
    arrowdown: '↓',
    arrowleft: '←',
    arrowright: '→',
    escape: 'Esc',
    enter: 'Enter',
    space: 'Space',
    tab: 'Tab',
    backspace: 'Backspace',
    delete: 'Delete',
    comma: ',',
    period: '.',
    slash: '/',
    backslash: '\\',
    bracketleft: '[',
    bracketright: ']',
    semicolon: ';',
    quote: "'",
    backquote: '`',
    minus: '-',
    equal: '=',
};

function labelForKey(key: string): string {
    if (KEY_LABELS[key]) return KEY_LABELS[key];
    if (key.length === 1) return key.toUpperCase();
    if (key.startsWith('f') && /^f\d{1,2}$/.test(key)) return key.toUpperCase();
    return key;
}

export function formatKeybind(chord: string): string {
    const parsed = parseKeybind(chord);
    if (!parsed) return '';

    const parts: string[] = [];
    if (parsed.super) {
        parts.push(formatSuperLabel());
    }
    if (parsed.mod) {
        // On Mac, `mod` is also ⌘ — skip if `super` already added it.
        // On Windows, `mod` is also Alt — skip if `super` already added it.
        const modLabel = formatModLabel();
        if (!(parsed.super && modLabel === formatSuperLabel())) {
            parts.push(modLabel);
        }
    }
    if (parsed.ctrl) {
        parts.push(IS_MAC ? '⌃' : 'Ctrl');
    }
    if (parsed.alt) {
        // Skip when `super`/`mod` already displayed Alt.
        const altAlreadyShown =
            (parsed.super && formatSuperLabel() === 'Alt') || (parsed.mod && formatModLabel() === 'Alt');
        if (!altAlreadyShown) {
            parts.push(IS_MAC ? '⌥' : 'Alt');
        }
    }
    if (parsed.shift) {
        parts.push(IS_MAC ? '⇧' : 'Shift');
    }
    if (parsed.key) {
        parts.push(labelForKey(parsed.key));
    }
    return parts.join(IS_MAC ? '' : '+');
}
