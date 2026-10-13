import { closeEditorTab, createSessionTab, openEditorTab, useEditorTabNavigation } from '@ui/modules/editor-tabs';
import { NewSession } from '@ui/modules/new-session';
import { upsertSession } from '@ui/modules/session-events';
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { styles } from './newSessionPage.styles';

export function NewSessionPage() {
    const navigate = useNavigate();
    const { closeTab } = useEditorTabNavigation();

    const onClose = useCallback(() => {
        closeTab('new-session');
    }, [closeTab]);

    return (
        <main className={styles.main}>
            <NewSession
                onClose={onClose}
                onStarted={(session) => {
                    upsertSession(session);
                    // Close the new-session tab and open the session tab in its place.
                    closeEditorTab('new-session');
                    openEditorTab(createSessionTab(session.id));
                    navigate(`/sessions/${session.id}`, { replace: true });
                }}
            />
        </main>
    );
}
