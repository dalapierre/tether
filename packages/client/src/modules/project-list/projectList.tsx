import { Button } from '@client/components/button';
import { Card } from '@client/components/card';
import { IconButton } from '@client/components/icon-button';
import { ApiError } from '@client/libs/api/client';
import { createRepository, listRepositories, type Repository } from '@client/libs/api/repositories';
import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { styles } from './projectList.styles';

export function ProjectList() {
    const navigate = useNavigate();
    const [repositories, setRepositories] = useState<Repository[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [adding, setAdding] = useState(false);
    const [name, setName] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

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

    function openAddForm() {
        setName('');
        setFormError(null);
        setAdding(true);
    }

    function closeAddForm() {
        if (submitting) return;
        setAdding(false);
        setName('');
        setFormError(null);
    }

    async function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const trimmed = name.trim();
        if (!trimmed) return;

        setFormError(null);
        setSubmitting(true);

        try {
            const repository = await createRepository(trimmed);
            setRepositories((current) => [...current, repository]);
            setAdding(false);
            setName('');
        } catch (err: unknown) {
            if (err instanceof ApiError) {
                setFormError(err.message);
            } else {
                setFormError(err instanceof Error ? err.message : 'Failed to add repository');
            }
        } finally {
            setSubmitting(false);
        }
    }

    if (adding) {
        return (
            <div className={styles.formOverlay}>
                <div className={styles.formHeader}>
                    <h1 className={styles.formTitle}>Add repository</h1>
                    <IconButton label='Close' onClick={closeAddForm} disabled={submitting}>
                        ×
                    </IconButton>
                </div>
                <form className={styles.form} onSubmit={onSubmit}>
                    <label className={styles.label}>
                        Name
                        <input
                            className={styles.input}
                            type='text'
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            autoFocus
                            required
                        />
                    </label>
                    {formError ? <p className={styles.error}>{formError}</p> : null}
                    <div className={styles.formActions}>
                        <Button type='submit' disabled={submitting || !name.trim()}>
                            {submitting ? 'Adding…' : 'Add repository'}
                        </Button>
                        <Button type='button' variant='secondary' onClick={closeAddForm} disabled={submitting}>
                            Cancel
                        </Button>
                    </div>
                </form>
            </div>
        );
    }

    return (
        <div className={styles.root}>
            <header className={styles.header}>
                <h1 className={styles.title}>Projects</h1>
                <IconButton label='Add repository' onClick={openAddForm}>
                    +
                </IconButton>
            </header>
            <div className={styles.content}>
                {loading ? <p className={styles.loading}>Loading projects…</p> : null}
                {!loading && error ? <p className={styles.error}>{error}</p> : null}
                {!loading && !error && repositories.length === 0 ? (
                    <p className={styles.empty}>No projects yet. Tap + to add a repository.</p>
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
