import { Button } from '@client/components/button';
import { PageHeader } from '@client/components/page-header';
import { getRepository } from '@client/libs/api/repositories';
import { NewSession } from '@client/modules/new-session';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { styles } from './projectPage.styles';

export function ProjectPage() {
    const { id } = useParams<{ id: string }>();
    const [name, setName] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        if (!id) {
            setName(null);
            setError('Project not found');
            return;
        }

        let cancelled = false;

        getRepository(id)
            .then((repository) => {
                if (cancelled) return;
                if (!repository) {
                    setName(null);
                    setError('Project not found');
                    return;
                }
                setName(repository.name);
                setError(null);
            })
            .catch((err: unknown) => {
                if (!cancelled) {
                    setName(null);
                    setError(err instanceof Error ? err.message : 'Failed to load project');
                }
            });

        return () => {
            cancelled = true;
        };
    }, [id]);

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
            <PageHeader crumbs={[{ label: 'projects', to: '/' }, { label: name ?? '…' }]} />
            <div className={styles.body}>
                {error ? <p className={styles.error}>{error}</p> : null}
                {!error ? <p className={styles.placeholder}>No sessions</p> : null}
            </div>
            {!error ? (
                <div className={styles.footer}>
                    <Button type='button' onClick={() => setCreating(true)}>
                        New session
                    </Button>
                </div>
            ) : null}
        </main>
    );
}
