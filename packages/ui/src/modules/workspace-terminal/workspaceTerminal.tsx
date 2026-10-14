import { connectWorkspaceShell, killWorkspaceShell, MAX_WORKSPACE_SHELLS } from '@ui/libs/api/workspace';
import { getWorkspaceShellRoster, setWorkspaceShellRoster } from '@ui/libs/layout/reviewLayoutPreferences';
import { formatExplainErrorPrompt } from '@ui/libs/terminal/explainErrorPrompt';
import {
    WORKSPACE_TERMINAL_ID,
    setTerminalTabTitle,
    terminalTabId,
    useEditorTabNavigation,
} from '@ui/modules/editor-tabs';
import { ShellSplitPanel, type ShellSplitPanelApi } from '@ui/modules/shell-split-panel';
import { showToast } from '@ui/modules/toast';
import { useCallback, useEffect, useRef } from 'react';
import { useIntl } from 'react-intl';
import {
    consumeWorkspaceShellSplitRequests,
    subscribeWorkspaceShellSplitRequests,
} from './workspaceShellSplitRequests';
import { messages } from './workspaceTerminal.messages';
import { styles } from './workspaceTerminal.styles';

export function WorkspaceTerminal() {
    const intl = useIntl();
    const { closeTab } = useEditorTabNavigation();
    const apiRef = useRef<ShellSplitPanelApi | null>(null);

    const closePanel = useCallback(() => {
        closeTab(terminalTabId(WORKSPACE_TERMINAL_ID));
    }, [closeTab]);

    const onActiveTitleChange = useCallback((title: string) => {
        setTerminalTabTitle(WORKSPACE_TERMINAL_ID, title);
    }, []);

    const onExplain = useCallback(
        (errorMessage: string, command: string) => {
            const prompt = formatExplainErrorPrompt(errorMessage, command);
            const started = apiRef.current?.splitWithHarnessPrompt(prompt) ?? false;
            if (!started) {
                showToast('generic-error', intl.formatMessage(messages.explainSplitFailed));
            }
        },
        [intl],
    );

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
            showCloseButton={false}
            apiRef={apiRef}
            onActiveTitleChange={onActiveTitleChange}
            onExplain={onExplain}
        />
    );
}
