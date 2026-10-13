import { connectWorkspaceShell } from '@ui/libs/api/workspace';
import { setTerminalTabTitle } from '@ui/modules/editor-tabs';
import { SessionShellTerminal } from '@ui/modules/session-view/sessionShellTerminal';
import { useCallback } from 'react';
import { styles } from './workspaceTerminal.styles';

export type WorkspaceTerminalProps = {
    terminalId: string;
};

export function WorkspaceTerminal({ terminalId }: WorkspaceTerminalProps) {
    const onTitle = useCallback(
        (title: string) => {
            setTerminalTabTitle(terminalId, title);
        },
        [terminalId],
    );

    return (
        <div className={styles.root}>
            <div className={styles.terminalHost}>
                <SessionShellTerminal
                    shellKey={terminalId}
                    connect={() => connectWorkspaceShell(terminalId)}
                    active
                    onTitle={onTitle}
                    onHandleChange={() => {}}
                />
            </div>
        </div>
    );
}
