export type EditorTabKind = 'session' | 'settings' | 'new-session' | 'new-quick-prompt' | 'terminal';

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

export type TerminalEditorTab = {
    id: `terminal:${string}`;
    kind: 'terminal';
    terminalId: string;
    /** Last known OSC / shell title; persisted so reloads don't flash a fallback label. */
    title?: string;
};

export type EditorTab =
    SessionEditorTab | SettingsEditorTab | NewSessionEditorTab | NewQuickPromptEditorTab | TerminalEditorTab;

export type EditorTabId = EditorTab['id'];
