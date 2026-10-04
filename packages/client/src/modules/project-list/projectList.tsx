import { Button } from '@client/components/button';
import { Card } from '@client/components/card';
import { PageHeader } from '@client/components/page-header';
import { listRepositories, type Repository } from '@client/libs/api/repositories';
import { AddRepository } from '@client/modules/add-repository';
import { useSettings } from '@client/modules/settings';
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';
import { messages } from './projectList.messages';
import { styles } from './projectList.styles';

export function ProjectList() {
    const intl = useIntl();
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
                    setError(err instanceof Error ? err.message : intl.formatMessage(messages.loadFailed));
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
    }, [intl]);

    function handleAdded(repository: Repository) {
        setRepositories((current) => [...current, repository].sort((a, b) => a.name.localeCompare(b.name)));
        setAdding(false);
    }

    if (adding) {
        return <AddRepository onClose={() => setAdding(false)} onAdded={handleAdded} />;
    }

    return (
        <div className={styles.root}>
            <PageHeader crumbs={[{ label: intl.formatMessage(messages.projectsCrumb) }]} />
            <div className={styles.content}>
                {loading ? <p className={styles.loading}>{intl.formatMessage(messages.loading)}</p> : null}
                {!loading && error ? <p className={styles.error}>{error}</p> : null}
                {!loading && !error && repositories.length === 0 ? (
                    <p className={styles.empty}>
                        {intl.formatMessage(messages.empty, {
                            devDirLink: (chunks) => (
                                <button type='button' className={styles.link} onClick={openSettings}>
                                    {chunks}
                                </button>
                            ),
                        })}
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
                        {intl.formatMessage(messages.newProject)}
                    </Button>
                </div>
            ) : null}
        </div>
    );
}
