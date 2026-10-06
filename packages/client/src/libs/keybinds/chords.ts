const MODIFIER_ORDER = ['super', 'mod', 'ctrl', 'alt', 'shift'] as const;

export type KeybindModifiers = {
    super: boolean;
    mod: boolean;
    ctrl: boolean;
    alt: boolean;
    shift: boolean;
};

export type ParsedKeybind = KeybindModifiers & {
    key: string;
};

const KEY_ALIASES: Record<string, string> = {
    ',': 'comma',
    '.': 'period',
    '/': 'slash',
    '\\': 'backslash',
    '[': 'bracketleft',
    ']': 'bracketright',
    ';': 'semicolon',
    "'": 'quote',
    '`': 'backquote',
    '-': 'minus',
    '=': 'equal',
    ' ': 'space',
    spacebar: 'space',
    esc: 'escape',
    return: 'enter',
    del: 'delete',
    meta: 'super',
    win: 'super',
    cmd: 'super',
    arrowup: 'arrowup',
    arrowdown: 'arrowdown',
    arrowleft: 'arrowleft',
    arrowright: 'arrowright',
    up: 'arrowup',
    down: 'arrowdown',
    left: 'arrowleft',
    right: 'arrowright',
};

function platformFlags(): { isMac: boolean; isWindows: boolean } {
    if (typeof navigator === 'undefined') {
        return { isMac: false, isWindows: false };
    }
    const id = `${navigator.platform} ${navigator.userAgent}`;
    return {
        isMac: /Mac|iPhone|iPad|iPod/i.test(id),
        isWindows: /Win/i.test(id),
    };
}

/**
 * App "super" modifier: ⌘ on Mac, Alt on Windows/Linux.
 * (Not the OS Super/Win key.)
 */
export function superKeyPressed(event: KeyboardEvent): boolean {
    const { isMac } = platformFlags();
    if (isMac) return event.metaKey;
    return event.altKey;
}

/** Primary modifier for `mod` chords: ⌘ on Mac, Alt on Windows, Ctrl elsewhere. */
export function modKeyPressed(event: KeyboardEvent): boolean {
    const { isMac, isWindows } = platformFlags();
    if (isMac) return event.metaKey;
    if (isWindows) return event.altKey;
    return event.ctrlKey;
}

export function formatModLabel(): string {
    const { isMac, isWindows } = platformFlags();
    if (isMac) return '⌘';
    if (isWindows) return 'Alt';
    return 'Ctrl';
}

export function formatSuperLabel(): string {
    const { isMac } = platformFlags();
    if (isMac) return '⌘';
    return 'Alt';
}

function normalizeKeyToken(token: string): string {
    const lower = token.trim().toLowerCase();
    if (!lower) return '';
    if (MODIFIER_ORDER.includes(lower as (typeof MODIFIER_ORDER)[number])) {
        return lower;
    }
    return KEY_ALIASES[lower] ?? lower;
}

export function parseKeybind(chord: string): ParsedKeybind | null {
    const trimmed = chord.trim().toLowerCase();
    if (!trimmed) return null;

    const parts = trimmed.split('+').map(normalizeKeyToken).filter(Boolean);
    if (parts.length === 0) return null;

    const modifiers: KeybindModifiers = {
        super: false,
        mod: false,
        ctrl: false,
        alt: false,
        shift: false,
    };

    let key = '';
    for (const part of parts) {
        if (part === 'super' || part === 'mod' || part === 'ctrl' || part === 'alt' || part === 'shift') {
            modifiers[part] = true;
            continue;
        }
        if (key) {
            // Multiple non-modifier keys — invalid.
            return null;
        }
        key = part;
    }

    if (!key) {
        // Modifier-only chords (e.g. scroll speed modifier = `shift`).
        if (!modifiers.super && !modifiers.mod && !modifiers.ctrl && !modifiers.alt && !modifiers.shift) {
            return null;
        }
        return { ...modifiers, key: '' };
    }
    return { ...modifiers, key };
}

export function serializeKeybind(parsed: ParsedKeybind): string {
    const parts: string[] = [];
    for (const modifier of MODIFIER_ORDER) {
        if (parsed[modifier]) {
            parts.push(modifier);
        }
    }
    if (parsed.key) {
        parts.push(parsed.key);
    }
    return parts.join('+');
}

function keyFromKeyboardEvent(event: KeyboardEvent): string | null {
    const raw = event.key;
    if (!raw) return null;

    const lower = raw.toLowerCase();
    if (lower === 'control' || lower === 'meta' || lower === 'alt' || lower === 'shift') {
        return null;
    }

    return normalizeKeyToken(lower === ' ' ? 'space' : lower) || null;
}

/** True when a modifier-only chord (no non-modifier key) is currently held. */
export function modifierChordHeld(event: KeyboardEvent, chord: string): boolean {
    const parsed = parseKeybind(chord);
    if (!parsed || parsed.key) return false;

    if (parsed.shift) return event.shiftKey;
    if (parsed.super) return superKeyPressed(event);
    if (parsed.mod) return modKeyPressed(event);
    if (parsed.ctrl) return event.ctrlKey;
    if (parsed.alt) return event.altKey;
    return false;
}

/** Map a KeyboardEvent into a normalized chord string. */
export function chordFromKeyboardEvent(event: KeyboardEvent): string | null {
    const key = keyFromKeyboardEvent(event);
    const { isMac, isWindows } = platformFlags();

    // Modifier-only press (for bindings like scroll speed modifier).
    if (!key) {
        const lower = event.key.toLowerCase();
        if (lower === 'shift') return 'shift';
        if (lower === 'control') return isMac || isWindows ? 'ctrl' : 'mod';
        if (lower === 'alt') return isMac ? 'alt' : 'super';
        if (lower === 'meta') return 'super';
        return null;
    }

    const superPressed = superKeyPressed(event);

    if (isMac) {
        return serializeKeybind({
            super: superPressed,
            mod: false,
            ctrl: event.ctrlKey,
            alt: event.altKey,
            shift: event.shiftKey,
            key,
        });
    }

    if (isWindows) {
        // Alt is `super` on Windows; don't also mark alt/mod.
        return serializeKeybind({
            super: superPressed,
            mod: false,
            ctrl: event.ctrlKey,
            alt: false,
            shift: event.shiftKey,
            key,
        });
    }

    // Linux: Alt is `super`; Ctrl is portable `mod`.
    return serializeKeybind({
        super: superPressed,
        mod: event.ctrlKey,
        ctrl: false,
        alt: false,
        shift: event.shiftKey,
        key,
    });
}

export function eventMatchesKeybind(
    event: KeyboardEvent,
    chord: string,
    options?: { ignoreModifiersFrom?: string },
): boolean {
    const parsed = parseKeybind(chord);
    if (!parsed) return false;

    // Modifier-only chords match the modifier key press/release itself.
    if (!parsed.key) {
        const lower = event.key.toLowerCase();
        if (parsed.shift) return lower === 'shift';
        if (parsed.ctrl) return lower === 'control';
        if (parsed.alt) return lower === 'alt';
        if (parsed.super) {
            const { isMac } = platformFlags();
            if (isMac) return lower === 'meta';
            return lower === 'alt' || lower === 'meta';
        }
        if (parsed.mod) {
            const { isMac, isWindows } = platformFlags();
            if (isMac) return lower === 'meta';
            if (isWindows) return lower === 'alt';
            return lower === 'control';
        }
        return false;
    }

    const key = keyFromKeyboardEvent(event);
    if (!key || key !== parsed.key) return false;

    let shiftKey = event.shiftKey;
    let altKey = event.altKey;
    let ctrlKey = event.ctrlKey;
    let metaKey = event.metaKey;

    // Ignore modifiers that belong to another binding (e.g. scroll speed modifier).
    const ignore = options?.ignoreModifiersFrom ? parseKeybind(options.ignoreModifiersFrom) : null;
    if (ignore && !ignore.key) {
        if (ignore.shift) shiftKey = false;
        if (ignore.ctrl) ctrlKey = false;
        if (ignore.alt) altKey = false;
        if (ignore.super || ignore.mod) {
            const { isMac, isWindows } = platformFlags();
            if (ignore.super) {
                if (isMac) metaKey = false;
                else altKey = false;
            }
            if (ignore.mod) {
                if (isMac) metaKey = false;
                else if (isWindows) altKey = false;
                else ctrlKey = false;
            }
        }
    }

    if (shiftKey !== parsed.shift) return false;

    const { isMac, isWindows } = platformFlags();

    if (isMac) {
        const wantMeta = parsed.super || parsed.mod;
        return metaKey === wantMeta && ctrlKey === parsed.ctrl && altKey === parsed.alt;
    }

    if (isWindows) {
        const wantAlt = parsed.super || parsed.mod || parsed.alt;
        return altKey === wantAlt && ctrlKey === parsed.ctrl && !metaKey;
    }

    const wantAlt = parsed.super || parsed.alt;
    const wantCtrl = parsed.mod || parsed.ctrl;
    const superPressed = isMac ? metaKey : altKey;
    return superPressed === wantAlt && ctrlKey === wantCtrl && !metaKey;
}

export function isEditableTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    if (target.isContentEditable) return true;
    const tag = target.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

/** xterm's hidden textarea — focused means agent "insert mode". */
export function isTerminalInsertTarget(target: EventTarget | null): boolean {
    return target instanceof HTMLTextAreaElement && target.classList.contains('xterm-helper-textarea');
}

/** True when the chord includes a non-shift modifier (safe to fire in editors). */
export function keybindHasNonShiftModifier(chord: string): boolean {
    const parsed = parseKeybind(chord);
    if (!parsed) return false;
    return parsed.super || parsed.mod || parsed.ctrl || parsed.alt;
}
