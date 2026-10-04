import { Button } from '@client/components/button';
import { PageHeader } from '@client/components/page-header';
import { getRepository } from '@client/libs/api/repositories';
import { NewSession } from '@client/modules/new-session';
import { showToast } from '@client/modules/toast';
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { useParams } from 'react-router-dom';
import { messages } from './projectPage.messages';
import { styles } from './projectPage.styles';

export function ProjectPage() {
    const intl = useIntl();
    const { slug } = useParams<{ slug: string }>();
    const [name, setName] = useState<string | null>(null);
    const [failed, setFailed] = useState(false);
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        if (!slug) {
            setName(null);
            setFailed(true);
            showToast('generic-error', intl.formatMessage(messages.notFound));
            return;
        }

        let cancelled = false;

        getRepository(slug)
            .then((repository) => {
                if (cancelled) return;
                if (!repository) {
                    setName(null);
                    setFailed(true);
                    showToast('generic-error', intl.formatMessage(messages.notFound));
                    return;
                }
                setName(repository.name);
                setFailed(false);
            })
            .catch((err: unknown) => {
                if (!cancelled) {
                    setName(null);
                    setFailed(true);
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

    if (creating && name) {
        return (
            <NewSession
                projectName={name}
                onClose={() => setCreating(false)}
                onStarted={() => {
                    setCreating(false);
                }}
            />
        );
    }

    return (
        <main className={styles.main}>
            <PageHeader
                crumbs={[
                    { label: intl.formatMessage(messages.projectsCrumb), to: '/' },
                    { label: name ?? intl.formatMessage(messages.loadingCrumb) },
                ]}
            />
            <div className={styles.body}>
                {!failed ? <p className={styles.placeholder}>{intl.formatMessage(messages.noSessions)}</p> : null}
            </div>
            {!failed ? (
                <div className={styles.footer}>
                    <Button type='button' onClick={() => setCreating(true)} disabled={!name}>
                        {intl.formatMessage(messages.newSession)}
                    </Button>
                </div>
            ) : null}
        </main>
    );
}
