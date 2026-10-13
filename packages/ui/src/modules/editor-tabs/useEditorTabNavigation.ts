import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    closeEditorTab,
    createSessionTab,
    editorTabFromPath,
    NEW_SESSION_TAB,
    openEditorTab,
    pathForEditorTab,
    SETTINGS_TAB,
} from './editorTabsStore';
import type { EditorTab, EditorTabId } from './editorTabs.types';

/** Open (or focus) a tab and navigate to its route. */
export function useEditorTabNavigation() {
    const navigate = useNavigate();
    const location = useLocation();

    const activateTab = useCallback(
        (tab: EditorTab) => {
            openEditorTab(tab);
            navigate(pathForEditorTab(tab));
        },
        [navigate],
    );

    const openSessionTab = useCallback(
        (sessionId: string) => {
            activateTab(createSessionTab(sessionId));
        },
        [activateTab],
    );

    const openSettingsTab = useCallback(() => {
        activateTab(SETTINGS_TAB);
    }, [activateTab]);

    const openNewSessionTab = useCallback(() => {
        activateTab(NEW_SESSION_TAB);
    }, [activateTab]);

    const closeTab = useCallback(
        (id: EditorTabId, options?: { replace?: boolean }) => {
            const activeId = editorTabFromPath(location.pathname)?.id ?? null;
            const wasActive = activeId === id;
            const fallback = closeEditorTab(id);
            if (!wasActive) return;
            navigate(fallback ? pathForEditorTab(fallback) : '/', {
                replace: options?.replace ?? true,
            });
        },
        [location.pathname, navigate],
    );

    return {
        activateTab,
        openSessionTab,
        openSettingsTab,
        openNewSessionTab,
        closeTab,
    };
}
