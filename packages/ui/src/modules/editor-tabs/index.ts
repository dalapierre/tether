export { EditorTabBar } from './editorTabBar';
export { EditorTabsSync } from './editorTabsSync';
export {
    closeEditorTab,
    closeSessionEditorTab,
    createSessionTab,
    createTerminalTab,
    createWorkspaceTerminalTab,
    editorTabFromPath,
    ensureEditorTabForPath,
    getEditorTabsSnapshot,
    moveEditorTab,
    NEW_QUICK_PROMPT_TAB,
    NEW_SESSION_TAB,
    openEditorTab,
    pathForEditorTab,
    pruneMissingSessionTabs,
    sessionTabId,
    setEditorTabsOrder,
    setTerminalTabTitle,
    SETTINGS_TAB,
    subscribeEditorTabs,
    syncSessionTabTitles,
    terminalTabId,
    WORKSPACE_TERMINAL_ID,
} from './editorTabsStore';
export type { EditorTab, EditorTabId, EditorTabKind } from './editorTabs.types';
export { createTerminalId, useEditorTabNavigation } from './useEditorTabNavigation';
