export type EditorTabKind = 'session' | 'settings' | 'new-session' | 'new-quick-prompt' | 'quick-prompt' | 'terminal';

export type SessionEditorTab = {
    id: `session:${string}`;
    kind: 'session';
    sessionId: string;
    /** Last known session name; persisted so reloads don't flash a fallback label. */
    title?: string;
};

export type SettingsEditorTab = {
    id: 'settings';
    kind: 'settings';
};

export type NewSessionEditorTab = {
    id: 'new-session';
    kind: 'new-session';
};

export type NewQuickPromptEditorTab = {
    id: 'new-quick-prompt';
    kind: 'new-quick-prompt';
};

export type QuickPromptEditorTab = {
    id: `quick-prompt:${string}`;
    kind: 'quick-prompt';
    promptId: string;
    /** Last known prompt name; persisted so reloads don't flash a fallback label. */
    title?: string;
};

export type TerminalEditorTab = {
    id: `terminal:${string}`;
    kind: 'terminal';
    terminalId: string;
    /** Last known OSC / shell title; persisted so reloads don't flash a fallback label. */
    title?: string;
};

export type EditorTab =
    | SessionEditorTab
    | SettingsEditorTab
    | NewSessionEditorTab
    | NewQuickPromptEditorTab
    | QuickPromptEditorTab
    | TerminalEditorTab;

export type EditorTabId = EditorTab['id'];
