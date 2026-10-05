import { Button } from '@client/components/button';
import { IconButton } from '@client/components/icon-button';
import { PageHeader } from '@client/components/page-header';
import { ApiError } from '@client/libs/api/client';
import { addRepository, listAvailableRepositories, type AvailableRepository } from '@client/libs/api/repositories';
import { showToast } from '@client/modules/toast';
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { messages } from './addRepository.messages';
import { styles } from './addRepository.styles';
import type { AddRepositoryProps } from './addRepository.types';

export function AddRepository({ onClose, onAdded }: AddRepositoryProps) {
    const intl = useIntl();
    const [available, setAvailable] = useState<AvailableRepository[]>([]);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [selected, setSelected] = useState<AvailableRepository | null>(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        let cancelled = false;

        listAvailableRepositories()
            .then((repositories) => {
                if (!cancelled) {
                    setAvailable(repositories);
                    setFailed(false);
                }
            })
            .catch((err: unknown) => {
                if (!cancelled) {
                    setFailed(true);
                    showToast(
                        'generic-error',
                        err instanceof Error ? err.message : intl.formatMessage(messages.loadFailed),
                    );
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

    useEffect(() => {
        function onKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape' && !submitting) {
                onClose();
            }
        }

        window.addEventListener('keydown', onKeyDown);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [onClose, submitting]);

    function handleClose() {
        if (submitting) return;
        onClose();
    }

    async function handleAdd() {
        if (!selected || submitting) return;

        setSubmitting(true);

        try {
            const repository = await addRepository(selected.path);
            onAdded(repository);
        } catch (err: unknown) {
            if (err instanceof ApiError) {
                showToast('generic-error', err.message);
            } else {
                showToast('generic-error', err instanceof Error ? err.message : intl.formatMessage(messages.addFailed));
            }
            setSubmitting(false);
        }
    }

    return (
        <div
            className={styles.root}
            role='dialog'
            aria-modal='true'
            aria-label={intl.formatMessage(messages.ariaLabel)}
        >
            <PageHeader
                crumbs={[
                    { label: intl.formatMessage(messages.settingsCrumb), onClick: handleClose },
                    { label: intl.formatMessage(messages.addCrumb) },
                ]}
                showSettings={false}
                actions={
                    <IconButton label={intl.formatMessage(messages.close)} onClick={handleClose} disabled={submitting}>
                        ×
                    </IconButton>
                }
            />

            <div className={styles.content}>
                {loading ? <p className={styles.loading}>{intl.formatMessage(messages.loading)}</p> : null}
                {!loading && !failed && available.length === 0 ? (
                    <p className={styles.empty}>
                        {intl.formatMessage(messages.empty, {
                            settingsLink: (chunks) => (
                                <button type='button' className={styles.link} onClick={handleClose}>
                                    {chunks}
                                </button>
                            ),
                        })}
                    </p>
                ) : null}
                {!loading && !failed
                    ? available.map((repository) => {
                          const isSelected = selected?.path === repository.path;
                          return (
                              <button
                                  key={repository.path}
                                  type='button'
                                  className={`${styles.option}${isSelected ? ` ${styles.optionSelected}` : ''}`}
                                  onClick={() => setSelected(repository)}
                                  aria-pressed={isSelected}
                                  disabled={submitting}
                              >
                                  {repository.name}
                              </button>
                          );
                      })
                    : null}
            </div>
            <div className={styles.footer}>
                <Button type='button' disabled={!selected || submitting} onClick={() => void handleAdd()}>
                    {submitting ? intl.formatMessage(messages.adding) : intl.formatMessage(messages.add)}
                </Button>
            </div>
        </div>
    );
}
