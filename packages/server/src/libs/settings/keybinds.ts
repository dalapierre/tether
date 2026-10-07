export const KEYBIND_CATEGORIES = ['home', 'session'] as const;

export type KeybindCategory = (typeof KEYBIND_CATEGORIES)[number];

export type HomeKeybinds = {
    newSession: string;
    openSettings: string;
    focusSearch: string;
    previousSession: string;
    nextSession: string;
    deleteSession: string;
    restartSession: string;
};

export type SessionKeybinds = {
    goBack: string;
    toggleReview: string;
    toggleTerminal: string;
    toggleAgentInsert: string;
    enterShellInsert: string;
    nextFile: string;
    previousFile: string;
    scrollFileUp: string;
    scrollFileDown: string;
    scrollSpeedModifier: string;
    toggleMarkdownPreview: string;
};

export type Keybinds = {
    home: HomeKeybinds;
    session: SessionKeybinds;
};

const HOME_ACTIONS = [
    'newSession',
    'openSettings',
    'focusSearch',
    'previousSession',
    'nextSession',
    'deleteSession',
    'restartSession',
] as const;
const SESSION_ACTIONS = [
    'goBack',
    'toggleReview',
    'toggleTerminal',
    'toggleAgentInsert',
    'enterShellInsert',
    'nextFile',
    'previousFile',
    'scrollFileUp',
    'scrollFileDown',
    'scrollSpeedModifier',
    'toggleMarkdownPreview',
] as const;

export const DEFAULT_KEYBINDS: Keybinds = {
    home: {
        newSession: 'n',
        openSettings: 'alt+,',
        focusSearch: 's',
        previousSession: 'arrowup',
        nextSession: 'arrowdown',
        deleteSession: 'delete',
        restartSession: 'r',
    },
    session: {
        goBack: 'escape',
        toggleReview: '.',
        toggleTerminal: 'alt+q',
        toggleAgentInsert: 'i',
        enterShellInsert: 't',
        nextFile: 'x',
        previousFile: 'z',
        scrollFileUp: 'arrowup',
        scrollFileDown: 'arrowdown',
        scrollSpeedModifier: 'shift',
        toggleMarkdownPreview: 'm',
    },
};

function isChordString(value: unknown): value is string {
    return typeof value === 'string';
}

function rewriteModToAlt(chord: string): string {
    // Persist Alt explicitly; older defaults/recording stored the platform mod as `mod` (Ctrl).
    // Accept macOS Option aliases; leave `super` chords alone.
    return chord
        .split('+')
        .map((part) => (part === 'mod' || part === 'ctrl' || part === 'option' || part === 'opt' ? 'alt' : part))
        .filter((part, index, parts) => part !== 'alt' || parts.indexOf('alt') === index)
        .join('+');
}

function pickCategory<T extends Record<string, string>>(value: unknown, actions: readonly (keyof T)[], defaults: T): T {
    const source = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
    const next = { ...defaults };
    for (const action of actions) {
        const raw = source[action as string];
        if (isChordString(raw)) {
            next[action] = rewriteModToAlt(raw.trim().toLowerCase()) as T[typeof action];
        }
    }
    return next;
}

export function normalizeKeybinds(value: unknown): Keybinds {
    const source = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
    const sessionSource =
        source.session && typeof source.session === 'object' ? { ...(source.session as Record<string, unknown>) } : {};

    // Migrate legacy codeReview category into session.
    const legacyCodeReview =
        source.codeReview && typeof source.codeReview === 'object'
            ? (source.codeReview as Record<string, unknown>)
            : null;
    if (legacyCodeReview) {
        for (const action of ['nextFile', 'previousFile', 'toggleMarkdownPreview'] as const) {
            if (!isChordString(sessionSource[action]) && isChordString(legacyCodeReview[action])) {
                sessionSource[action] = legacyCodeReview[action];
            }
        }
    }

    // Migrate renamed focusAgent → toggleAgentInsert.
    if (!isChordString(sessionSource.toggleAgentInsert) && isChordString(sessionSource.focusAgent)) {
        sessionSource.toggleAgentInsert = sessionSource.focusAgent;
    }

    // Migrate previous default (toggle via super+1) to enter with i / exit with super+i.
    if (sessionSource.toggleAgentInsert === 'super+1') {
        sessionSource.toggleAgentInsert = 'i';
    }

    // Migrate previous default goBack chord.
    if (sessionSource.goBack === 'q') {
        sessionSource.goBack = 'escape';
    }

    return {
        home: pickCategory(source.home, HOME_ACTIONS, DEFAULT_KEYBINDS.home),
        session: pickCategory(sessionSource, SESSION_ACTIONS, DEFAULT_KEYBINDS.session),
    };
}

export function isKeybinds(value: unknown): value is Keybinds {
    if (!value || typeof value !== 'object') return false;
    const record = value as Record<string, unknown>;
    for (const category of KEYBIND_CATEGORIES) {
        const group = record[category];
        if (!group || typeof group !== 'object') return false;
    }
    return true;
}
