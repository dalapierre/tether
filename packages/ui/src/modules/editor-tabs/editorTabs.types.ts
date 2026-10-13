export type EditorTabKind = 'session' | 'settings' | 'new-session';

export type SessionEditorTab = {
    id: `session:${string}`;
    kind: 'session';
    sessionId: string;
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
