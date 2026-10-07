export const KEYBIND_CATEGORIES = ['home', 'session'] as const;

export type KeybindCategory = (typeof KEYBIND_CATEGORIES)[number];

export type HomeKeybindAction =
    'newSession' | 'openSettings' | 'focusSearch' | 'previousSession' | 'nextSession' | 'deleteSession';
export type SessionKeybindAction =
    | 'goBack'
    | 'toggleReview'
    | 'toggleTerminal'
    | 'toggleAgentInsert'
    | 'enterShellInsert'
    | 'nextFile'
    | 'previousFile'
    | 'scrollFileUp'
    | 'scrollFileDown'
    | 'scrollSpeedModifier'
    | 'toggleMarkdownPreview';

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
];

export const SESSION_KEYBIND_ACTIONS: readonly SessionKeybindAction[] = [
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

export function cloneKeybinds(keybinds: Keybinds): Keybinds {
    return {
        home: { ...keybinds.home },
        session: { ...keybinds.session },
    };
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
