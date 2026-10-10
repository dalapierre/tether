export const KEYBIND_CATEGORIES = ['home', 'session'] as const;

export type KeybindCategory = (typeof KEYBIND_CATEGORIES)[number];

export type HomeKeybindAction =
    | 'newSession'
    | 'openSettings'
    | 'focusSearch'
    | 'previousSession'
    | 'nextSession'
    | 'deleteSession'
    | 'restartSession';
export type SessionKeybindAction =
    | 'goBack'
    | 'toggleReview'
    | 'reviewFullscreen'
    | 'toggleTerminal'
    | 'enterAgentInsert'
    | 'exitAgentInsert'
    | 'enterShellInsert'
    | 'nextFile'
    | 'previousFile'
    | 'discardFile'
    | 'commentSelection'
    | 'scrollFileUp'
    | 'scrollFileDown'
    | 'scrollSpeedModifier'
    | 'toggleMarkdownPreview'
    | 'markFileReviewed'
    | 'diffViewSplit'
    | 'diffViewNegative'
    | 'diffViewPositive';

export type KeybindActionForCategory = {
    home: HomeKeybindAction;
    session: SessionKeybindAction;
};

export type HomeKeybinds = Record<HomeKeybindAction, string>;
export type SessionKeybinds = Record<SessionKeybindAction, string>;

export type Keybinds = {
    home: HomeKeybinds;
    session: SessionKeybinds;
};

export const HOME_KEYBIND_ACTIONS: readonly HomeKeybindAction[] = [
    'newSession',
    'openSettings',
    'focusSearch',
    'previousSession',
    'nextSession',
    'deleteSession',
    'restartSession',
];

export const SESSION_KEYBIND_ACTIONS: readonly SessionKeybindAction[] = [
    'goBack',
    'toggleReview',
    'reviewFullscreen',
    'toggleTerminal',
    'enterAgentInsert',
    'exitAgentInsert',
    'enterShellInsert',
    'nextFile',
    'previousFile',
    'discardFile',
    'commentSelection',
    'scrollFileUp',
    'scrollFileDown',
    'scrollSpeedModifier',
    'toggleMarkdownPreview',
    'markFileReviewed',
    'diffViewSplit',
    'diffViewNegative',
    'diffViewPositive',
];

export const KEYBIND_ACTIONS_BY_CATEGORY = {
    home: HOME_KEYBIND_ACTIONS,
    session: SESSION_KEYBIND_ACTIONS,
} as const;

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
        goBack: '',
        toggleReview: '.',
        reviewFullscreen: 'super+.',
        toggleTerminal: 'alt+q',
        enterAgentInsert: 'i',
        exitAgentInsert: 'alt+i',
        enterShellInsert: 't',
        nextFile: 'x',
        previousFile: 'z',
        discardFile: 'd',
        commentSelection: 'c',
        scrollFileUp: 'arrowup',
        scrollFileDown: 'arrowdown',
        scrollSpeedModifier: 'shift',
        toggleMarkdownPreview: 'm',
        markFileReviewed: 'r',
        diffViewSplit: ']',
        diffViewNegative: '[',
        diffViewPositive: 'p',
    },
};

/** Clone and fill any missing actions from defaults (e.g. after new keybinds ship). */
export function cloneKeybinds(keybinds: Keybinds): Keybinds {
    const home = { ...DEFAULT_KEYBINDS.home };
    const session = { ...DEFAULT_KEYBINDS.session };
    for (const action of HOME_KEYBIND_ACTIONS) {
        const chord = keybinds.home?.[action];
        if (typeof chord === 'string') {
            home[action] = chord;
        }
    }
    for (const action of SESSION_KEYBIND_ACTIONS) {
        const chord = keybinds.session?.[action];
        if (typeof chord === 'string') {
            session[action] = chord;
        }
    }
    return { home, session };
}

export function keybindsEqual(a: Keybinds, b: Keybinds): boolean {
    for (const category of KEYBIND_CATEGORIES) {
        const actions = KEYBIND_ACTIONS_BY_CATEGORY[category];
        for (const action of actions) {
            if (a[category][action as never] !== b[category][action as never]) {
                return false;
            }
        }
    }
    return true;
}
