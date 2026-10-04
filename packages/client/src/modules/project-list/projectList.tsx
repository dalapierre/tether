import { Card } from '@client/components/card';
import { listRepositories, type Repository } from '@client/libs/api/repositories';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { styles } from './projectList.styles';

export function ProjectList() {
    const navigate = useNavigate();
    const [repositories, setRepositories] = useState<Repository[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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

    return (
        <div className={styles.root}>
            <header className={styles.header}>
                <h1 className={styles.title}>Projects</h1>
            </header>
            <div className={styles.content}>
                {loading ? <p className={styles.loading}>Loading projects…</p> : null}
                {!loading && error ? <p className={styles.error}>{error}</p> : null}
                {!loading && !error && repositories.length === 0 ? (
                    <p className={styles.empty}>
                        No repositories found. Set a development directory in{' '}
                        <Link className={styles.link} to='/settings'>
                            Settings
                        </Link>
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
        </div>
    );
}
