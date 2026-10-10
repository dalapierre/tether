import { SessionView } from '@ui/modules/session-view';
import { useParams } from 'react-router-dom';
import { styles } from './sessionPage.styles';

export function SessionPage() {
    const { sessionId } = useParams<{ sessionId: string }>();

    if (!sessionId) {
        return <main className={styles.main} />;
    }

    return (
        <main className={styles.main}>
            <SessionView sessionId={sessionId} />
        </main>
    );
}
