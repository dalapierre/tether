export { EditorTabBar } from './editorTabBar';
export { EditorTabsSync } from './editorTabsSync';
export {
    closeEditorTab,
    closeSessionEditorTab,
    createSessionTab,
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
    SETTINGS_TAB,
    subscribeEditorTabs,
    syncSessionTabTitles,
} from './editorTabsStore';
export type { EditorTab, EditorTabId, EditorTabKind } from './editorTabs.types';
export { useEditorTabNavigation } from './useEditorTabNavigation';
