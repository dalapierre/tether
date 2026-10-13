export { EditorTabBar } from './editorTabBar';
export { EditorTabsSync } from './editorTabsSync';
export {
    closeEditorTab,
    closeSessionEditorTab,
    createSessionTab,
    editorTabFromPath,
    ensureEditorTabForPath,
    getEditorTabsSnapshot,
    NEW_SESSION_TAB,
    openEditorTab,
    pathForEditorTab,
    pruneMissingSessionTabs,
    sessionTabId,
    SETTINGS_TAB,
    subscribeEditorTabs,
} from './editorTabsStore';
export type { EditorTab, EditorTabId, EditorTabKind } from './editorTabs.types';
export { useEditorTabNavigation } from './useEditorTabNavigation';
