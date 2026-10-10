import { getPanelReturnPath } from '@ui/libs/navigation/panelReturn';
import { NewSession } from '@ui/modules/new-session';
import { upsertSession } from '@ui/modules/session-events';
import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { styles } from './newSessionPage.styles';

export function NewSessionPage() {
    const navigate = useNavigate();
    const location = useLocation();

    const onClose = useCallback(() => {
        navigate(getPanelReturnPath(location.state));
    }, [location.state, navigate]);

    return (
        <main className={styles.main}>
            <NewSession
                onClose={onClose}
                onStarted={(session) => {
                    upsertSession(session);
                    navigate(`/sessions/${session.id}`, { replace: true });
                }}
            />
        </main>
    );
}
