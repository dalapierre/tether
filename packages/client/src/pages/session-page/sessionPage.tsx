import { getRepository } from '@client/libs/api/repositories';
import { SessionView } from '@client/modules/session-view';
import { showToast } from '@client/modules/toast';
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { useParams } from 'react-router-dom';
import { messages } from './sessionPage.messages';
import { styles } from './sessionPage.styles';

export function SessionPage() {
    const intl = useIntl();
    const { slug, sessionId } = useParams<{ slug: string; sessionId: string }>();
    const [projectName, setProjectName] = useState<string | null>(null);

    useEffect(() => {
        if (!slug) {
            setProjectName(null);
            showToast('generic-error', intl.formatMessage(messages.projectNotFound));
            return;
        }

        let cancelled = false;

        getRepository(slug)
            .then((repository) => {
                if (cancelled) return;
                if (!repository) {
                    setProjectName(null);
                    showToast('generic-error', intl.formatMessage(messages.projectNotFound));
                    return;
                }
                setProjectName(repository.name);
            })
            .catch((err: unknown) => {
                if (!cancelled) {
                    setProjectName(null);
                    showToast(
                        'generic-error',
                        err instanceof Error ? err.message : intl.formatMessage(messages.loadFailed),
                    );
                }
            });

        return () => {
            cancelled = true;
        };
    }, [slug, intl]);

    if (!slug || !sessionId) {
        return <main className={styles.main} />;
    }

    return (
        <main className={styles.main}>
            <SessionView
                projectSlug={slug}
                projectName={projectName ?? intl.formatMessage(messages.loadingCrumb)}
                sessionId={sessionId}
            />
        </main>
    );
}
