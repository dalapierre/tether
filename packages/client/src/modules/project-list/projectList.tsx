import { Button } from '@client/components/button';
import { Card } from '@client/components/card';
import { PageHeader } from '@client/components/page-header';
import { listRepositories, type Repository } from '@client/libs/api/repositories';
import { AddRepository } from '@client/modules/add-repository';
import { useSettings } from '@client/modules/settings';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { styles } from './projectList.styles';

export function ProjectList() {
    const navigate = useNavigate();
    const { openSettings } = useSettings();
    const [repositories, setRepositories] = useState<Repository[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [adding, setAdding] = useState(false);

    useEffect(() => {
        let cancelled = false;

        listRepositories()
            .then((items) => {
                if (!cancelled) {
                    setRepositories(items);
                    setError(null);
                }
            })
            .catch((err: unknown) => {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : 'Failed to load projects');
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, []);

    function handleAdded(repository: Repository) {
        setRepositories((current) => [...current, repository].sort((a, b) => a.name.localeCompare(b.name)));
        setAdding(false);
    }

    if (adding) {
        return <AddRepository onClose={() => setAdding(false)} onAdded={handleAdded} />;
    }

    return (
        <div className={styles.root}>
            <PageHeader crumbs={[{ label: 'projects' }]} />
            <div className={styles.content}>
                {loading ? <p className={styles.loading}>Loading projects…</p> : null}
                {!loading && error ? <p className={styles.error}>{error}</p> : null}
                {!loading && !error && repositories.length === 0 ? (
                    <p className={styles.empty}>
                        No projects yet. Tap New project to add a repository from your{' '}
                        <button type='button' className={styles.link} onClick={openSettings}>
                            development directory
                        </button>
                        .
                    </p>
                ) : null}
                {!loading && !error
                    ? repositories.map((repository) => (
                          <Card
                              key={repository.id}
                              title={repository.name}
                              onClick={() => navigate(`/projects/${repository.id}`)}
                          />
                      ))
                    : null}
            </div>
            {!loading && !error ? (
                <div className={styles.footer}>
                    <Button type='button' onClick={() => setAdding(true)}>
                        New project
                    </Button>
                </div>
            ) : null}
        </div>
    );
}
