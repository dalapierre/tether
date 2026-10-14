import { connectWorkspaceShell, killWorkspaceShell, MAX_WORKSPACE_SHELLS } from '@ui/libs/api/workspace';
import { getWorkspaceShellRoster, setWorkspaceShellRoster } from '@ui/libs/layout/reviewLayoutPreferences';
import {
    WORKSPACE_TERMINAL_ID,
    setTerminalTabTitle,
    terminalTabId,
    useEditorTabNavigation,
} from '@ui/modules/editor-tabs';
import { ShellSplitPanel, type ShellSplitPanelApi } from '@ui/modules/shell-split-panel';
import { useCallback, useEffect, useRef } from 'react';
import {
    consumeWorkspaceShellSplitRequests,
    subscribeWorkspaceShellSplitRequests,
} from './workspaceShellSplitRequests';
import { styles } from './workspaceTerminal.styles';

export function WorkspaceTerminal() {
    const { closeTab } = useEditorTabNavigation();
    const apiRef = useRef<ShellSplitPanelApi | null>(null);

    const closePanel = useCallback(() => {
        closeTab(terminalTabId(WORKSPACE_TERMINAL_ID));
    }, [closeTab]);

    const onActiveTitleChange = useCallback((title: string) => {
        setTerminalTabTitle(WORKSPACE_TERMINAL_ID, title);
    }, []);

    useEffect(() => {
        const applyPending = () => {
            const count = consumeWorkspaceShellSplitRequests();
            for (let i = 0; i < count; i += 1) {
                apiRef.current?.split();
            }
        };
        applyPending();
        return subscribeWorkspaceShellSplitRequests(applyPending);
    }, []);

    return (
        <ShellSplitPanel
            className={styles.root}
            scopeKey='workspace'
            maxShells={MAX_WORKSPACE_SHELLS}
            getRoster={getWorkspaceShellRoster}
            setRoster={setWorkspaceShellRoster}
            connect={connectWorkspaceShell}
            killShell={killWorkspaceShell}
            onClose={closePanel}
            apiRef={apiRef}
            onActiveTitleChange={onActiveTitleChange}
        />
    );
}
