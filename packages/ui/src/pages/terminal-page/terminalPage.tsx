import { WORKSPACE_TERMINAL_ID } from '@ui/modules/editor-tabs';
import { WorkspaceTerminal } from '@ui/modules/workspace-terminal';
import { Navigate, useParams } from 'react-router-dom';
import { styles } from './terminalPage.styles';

export function TerminalPage() {
    const { terminalId } = useParams<{ terminalId: string }>();

    if (!terminalId) {
        return <main className={styles.main} />;
    }

    // Legacy per-shell terminal routes collapse into the shared workspace panel.
    if (terminalId !== WORKSPACE_TERMINAL_ID) {
        return <Navigate to={`/terminals/${WORKSPACE_TERMINAL_ID}`} replace />;
    }

    return (
        <main className={styles.main}>
            <WorkspaceTerminal />
        </main>
    );
}
