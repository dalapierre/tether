import { PageHeader } from '@client/components/page-header';
import { getRepository } from '@client/libs/api/repositories';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { styles } from './projectPage.styles';

export function ProjectPage() {
    const { id } = useParams<{ id: string }>();
    const [name, setName] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

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

    return (
        <main className={styles.main}>
            <PageHeader crumbs={[{ label: 'projects', to: '/' }, { label: name ?? '…' }]} />
            <div className={styles.body}>
                {error ? <p className={styles.error}>{error}</p> : null}
                {!error ? <p className={styles.placeholder}>Project coming soon.</p> : null}
            </div>
        </main>
    );
}
