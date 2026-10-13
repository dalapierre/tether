import { WorkspaceTerminal } from '@ui/modules/workspace-terminal';
import { useParams } from 'react-router-dom';
import { styles } from './terminalPage.styles';

export function TerminalPage() {
    const { terminalId } = useParams<{ terminalId: string }>();

    if (!terminalId) {
        return <main className={styles.main} />;
    }

    return (
        <main className={styles.main}>
            <WorkspaceTerminal terminalId={terminalId} />
        </main>
    );
}
