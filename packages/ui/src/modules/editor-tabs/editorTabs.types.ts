export type EditorTabKind = 'session' | 'settings' | 'new-session';

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

export type EditorTab = SessionEditorTab | SettingsEditorTab | NewSessionEditorTab;

export type EditorTabId = EditorTab['id'];
