import { Button } from '@client/components/button';
import { PageHeader } from '@client/components/page-header';
import { getRepository } from '@client/libs/api/repositories';
import { NewSession } from '@client/modules/new-session';
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { useParams } from 'react-router-dom';
import { messages } from './projectPage.messages';
import { styles } from './projectPage.styles';

export function ProjectPage() {
    const intl = useIntl();
    const { slug } = useParams<{ slug: string }>();
    const [name, setName] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        if (!slug) {
            setName(null);
            setError(intl.formatMessage(messages.notFound));
            return;
        }

        let cancelled = false;

        getRepository(slug)
            .then((repository) => {
                if (cancelled) return;
                if (!repository) {
                    setName(null);
                    setError(intl.formatMessage(messages.notFound));
                    return;
                }
                setName(repository.name);
                setError(null);
            })
            .catch((err: unknown) => {
                if (!cancelled) {
                    setName(null);
                    setError(err instanceof Error ? err.message : intl.formatMessage(messages.loadFailed));
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
                {error ? <p className={styles.error}>{error}</p> : null}
                {!error ? <p className={styles.placeholder}>{intl.formatMessage(messages.noSessions)}</p> : null}
            </div>
            {!error ? (
                <div className={styles.footer}>
                    <Button type='button' onClick={() => setCreating(true)}>
                        {intl.formatMessage(messages.newSession)}
                    </Button>
                </div>
            ) : null}
        </main>
    );
}
