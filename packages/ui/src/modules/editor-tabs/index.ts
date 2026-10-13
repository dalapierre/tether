export { EditorTabBar } from './editorTabBar';
export { EditorTabsSync } from './editorTabsSync';
export {
    closeEditorTab,
    closeSessionEditorTab,
    createSessionTab,
    createTerminalTab,
    editorTabFromPath,
    ensureEditorTabForPath,
    getEditorTabsSnapshot,
    moveEditorTab,
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
} from './editorTabsStore';
export type { EditorTab, EditorTabId, EditorTabKind } from './editorTabs.types';
export { createTerminalId, useEditorTabNavigation } from './useEditorTabNavigation';
