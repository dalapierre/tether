import { killWorkspaceShell } from '@ui/libs/api/workspace';
import { getLiveSession } from '@ui/modules/session-events';
import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    closeEditorTab,
    createSessionTab,
    createTerminalTab,
    editorTabFromPath,
    getEditorTabsSnapshot,
    NEW_SESSION_TAB,
    openEditorTab,
    pathForEditorTab,
    SETTINGS_TAB,
} from './editorTabsStore';
import type { EditorTab, EditorTabId } from './editorTabs.types';

/** Client-side terminal ids; avoid `crypto.randomUUID` (secure-context only — fails on LAN HTTP). */
export function createTerminalId(): string {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

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
        (sessionId: string, title?: string) => {
            const resolvedTitle = title ?? getLiveSession(sessionId)?.name;
            activateTab(createSessionTab(sessionId, resolvedTitle));
        },
        [activateTab],
    );

    const openSettingsTab = useCallback(() => {
        activateTab(SETTINGS_TAB);
    }, [activateTab]);

    const openNewSessionTab = useCallback(() => {
        activateTab(NEW_SESSION_TAB);
    }, [activateTab]);

    const openTerminalTab = useCallback(
        (terminalId?: string, title?: string) => {
            activateTab(createTerminalTab(terminalId ?? createTerminalId(), title));
        },
        [activateTab],
    );

    const closeTab = useCallback(
        (id: EditorTabId, options?: { replace?: boolean }) => {
            const closing = getEditorTabsSnapshot().find((tab) => tab.id === id);
            const activeId = editorTabFromPath(location.pathname)?.id ?? null;
            const wasActive = activeId === id;
            const fallback = closeEditorTab(id);
            if (closing?.kind === 'terminal') {
                void killWorkspaceShell(closing.terminalId).catch(() => {
                    // Best-effort; tab is already gone from the UI.
                });
            }
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
        openTerminalTab,
        closeTab,
    };
}
