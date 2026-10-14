import { killWorkspaceShell } from '@ui/libs/api/workspace';
import { clearWorkspaceShellRoster } from '@ui/libs/layout/reviewLayoutPreferences';
import { getLiveSession } from '@ui/modules/session-events';
import { requestWorkspaceShellSplit } from '@ui/modules/workspace-terminal/workspaceShellSplitRequests';
import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    closeEditorTab,
    createSessionTab,
    createWorkspaceTerminalTab,
    editorTabFromPath,
    getEditorTabsSnapshot,
    NEW_QUICK_PROMPT_TAB,
    NEW_SESSION_TAB,
    openEditorTab,
    pathForEditorTab,
    SETTINGS_TAB,
    WORKSPACE_TERMINAL_ID,
} from './editorTabsStore';
import type { EditorTab, EditorTabId } from './editorTabs.types';

/** Client-side ids; avoid `crypto.randomUUID` (secure-context only — fails on LAN HTTP). */
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

    const openNewQuickPromptTab = useCallback(() => {
        activateTab(NEW_QUICK_PROMPT_TAB);
    }, [activateTab]);

    const openTerminalTab = useCallback(
        (title?: string) => {
            const snapshot = getEditorTabsSnapshot();
            const workspaceTab = createWorkspaceTerminalTab(title);
            const alreadyOpen = snapshot.some(
                (tab) => tab.kind === 'terminal' && tab.terminalId === WORKSPACE_TERMINAL_ID,
            );

            // Collapse legacy one-shell-per-tab terminals into the shared panel.
            for (const tab of snapshot) {
                if (tab.kind !== 'terminal' || tab.terminalId === WORKSPACE_TERMINAL_ID) continue;
                closeEditorTab(tab.id);
                void killWorkspaceShell(tab.terminalId).catch(() => {
                    // Best-effort cleanup of orphaned PTYs.
                });
            }

            activateTab(workspaceTab);
            if (alreadyOpen) {
                requestWorkspaceShellSplit();
            }
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
                if (closing.terminalId === WORKSPACE_TERMINAL_ID) {
                    clearWorkspaceShellRoster();
                    void killWorkspaceShell().catch(() => {
                        // Best-effort; tab is already gone from the UI.
                    });
                } else {
                    void killWorkspaceShell(closing.terminalId).catch(() => {
                        // Best-effort; tab is already gone from the UI.
                    });
                }
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
        openNewQuickPromptTab,
        openTerminalTab,
        closeTab,
    };
}
