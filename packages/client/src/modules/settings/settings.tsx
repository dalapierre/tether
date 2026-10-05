import { Button } from '@client/components/button';
import { ConfirmDialog } from '@client/components/confirm-dialog';
import { IconButton } from '@client/components/icon-button';
import { PageHeader } from '@client/components/page-header';
import { AGENTS, isAgentId, type AgentId } from '@client/libs/agents/agents';
import { ApiError } from '@client/libs/api/client';
import { deleteRepository, listRepositories, type Repository } from '@client/libs/api/repositories';
import { getSettings, updateSettings } from '@client/libs/api/settings';
import { clearAccessToken } from '@client/libs/auth/session';
import { AddRepository } from '@client/modules/add-repository';
import { showToast } from '@client/modules/toast';
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';
import { messages } from './settings.messages';
import { styles } from './settings.styles';
import type { SettingsProps } from './settings.types';

export function Settings({ onClose }: SettingsProps) {
    const intl = useIntl();
    const navigate = useNavigate();
    const [devDir, setDevDir] = useState('');
    const [agent, setAgent] = useState<AgentId>('cursor');
    const [yoloMode, setYoloMode] = useState(false);
    const [repositories, setRepositories] = useState<Repository[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [adding, setAdding] = useState(false);
    const [pendingRemove, setPendingRemove] = useState<Repository | null>(null);
    const [removingId, setRemovingId] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        Promise.all([getSettings(), listRepositories()])
            .then(([settings, items]) => {
                if (cancelled) return;
                setDevDir(settings.devDir);
                setAgent(isAgentId(settings.agent) ? settings.agent : 'cursor');
                setYoloMode(Boolean(settings.yoloMode));
                setRepositories(items);
            })
            .catch((err: unknown) => {
                if (!cancelled) {
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
            if (event.key !== 'Escape') return;
            if (adding || pendingRemove) return;
            onClose();
        }

        window.addEventListener('keydown', onKeyDown);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [adding, onClose, pendingRemove]);

    async function handleSave() {
        setSaving(true);

        try {
            const settings = await updateSettings({
                devDir: devDir.trim(),
                agent,
                yoloMode,
            });
            setDevDir(settings.devDir);
            setAgent(settings.agent);
            setYoloMode(settings.yoloMode);
            showToast('settings-saved');
        } catch (err: unknown) {
            if (err instanceof ApiError) {
                showToast('generic-error', err.message);
            } else {
                showToast(
                    'generic-error',
                    err instanceof Error ? err.message : intl.formatMessage(messages.saveFailed),
                );
            }
        } finally {
            setSaving(false);
        }
    }

    function onSignOut() {
        clearAccessToken();
        navigate('/login', { replace: true });
    }

    function handleAdded(repository: Repository) {
        setRepositories((current) => [...current, repository].sort((a, b) => a.name.localeCompare(b.name)));
        setAdding(false);
        showToast('repository-added', repository.name);
    }

    async function confirmRemove() {
        const repository = pendingRemove;
        if (!repository || removingId) return;

        setRemovingId(repository.id);
        setPendingRemove(null);
        setRepositories((current) => current.filter((item) => item.id !== repository.id));

        try {
            await deleteRepository(repository.id);
        } catch (err: unknown) {
            setRepositories((current) => [...current, repository].sort((a, b) => a.name.localeCompare(b.name)));
            showToast(
                'generic-error',
                err instanceof Error ? err.message : intl.formatMessage(messages.removeProjectFailed),
            );
        } finally {
            setRemovingId(null);
        }
    }

    if (adding) {
        return <AddRepository onClose={() => setAdding(false)} onAdded={handleAdded} />;
    }

    return (
        <div
            className={styles.root}
            role='dialog'
            aria-modal='true'
            aria-label={intl.formatMessage(messages.ariaLabel)}
        >
            <PageHeader
                crumbs={[{ label: intl.formatMessage(messages.crumb) }]}
                showSettings={false}
                actions={
                    <IconButton label={intl.formatMessage(messages.close)} onClick={onClose}>
                        ×
                    </IconButton>
                }
            />
            <div className={styles.body}>
                <p className={styles.intro}>{intl.formatMessage(messages.intro)}</p>

                {loading ? <p className={styles.loading}>{intl.formatMessage(messages.loading)}</p> : null}

                {!loading ? (
                    <>
                        <div className={styles.fields}>
                            <label className={styles.label}>
                                {intl.formatMessage(messages.devDirLabel)}
                                <input
                                    className={styles.input}
                                    type='text'
                                    value={devDir}
                                    onChange={(event) => setDevDir(event.target.value)}
                                    placeholder={intl.formatMessage(messages.devDirPlaceholder)}
                                    autoComplete='off'
                                    spellCheck={false}
                                />
                            </label>
                            <p className={styles.hint}>{intl.formatMessage(messages.devDirHint)}</p>

                            <div>
                                <p className={styles.label}>{intl.formatMessage(messages.projectsLabel)}</p>
                                <div className={styles.projects}>
                                    {repositories.length === 0 ? (
                                        <p className={styles.projectEmpty}>
                                            {intl.formatMessage(messages.projectsEmpty)}
                                        </p>
                                    ) : (
                                        repositories.map((repository) => (
                                            <div key={repository.id} className={styles.projectRow}>
                                                <span className={styles.projectName}>{repository.name}</span>
                                                <button
                                                    type='button'
                                                    className={styles.removeButton}
                                                    disabled={removingId === repository.id}
                                                    onClick={() => setPendingRemove(repository)}
                                                >
                                                    {intl.formatMessage(messages.removeProject)}
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                                <div className={styles.addProject}>
                                    <Button type='button' variant='secondary' onClick={() => setAdding(true)}>
                                        {intl.formatMessage(messages.addProject)}
                                    </Button>
                                </div>
                            </div>

                            <label className={styles.label}>
                                {intl.formatMessage(messages.agentLabel)}
                                <select
                                    className={styles.select}
                                    value={agent}
                                    onChange={(event) => {
                                        const next = event.target.value;
                                        if (isAgentId(next)) {
                                            setAgent(next);
                                        }
                                    }}
                                >
                                    {AGENTS.map((option) => (
                                        <option key={option.id} value={option.id}>
                                            {intl.formatMessage(option.labelMessage)}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <div>
                                <label className={styles.checkboxLabel}>
                                    <input
                                        className={styles.checkbox}
                                        type='checkbox'
                                        checked={yoloMode}
                                        onChange={(event) => setYoloMode(event.target.checked)}
                                    />
                                    {intl.formatMessage(messages.yoloModeLabel)}
                                </label>
                                <p className={styles.hint}>{intl.formatMessage(messages.yoloModeHint)}</p>
                            </div>
                        </div>

                        <div className={styles.actions}>
                            <Button type='button' variant='secondary' onClick={onSignOut}>
                                {intl.formatMessage(messages.signOut)}
                            </Button>
                        </div>
                    </>
                ) : null}
            </div>
            {!loading ? (
                <div className={styles.footer}>
                    <Button type='button' onClick={handleSave} disabled={saving}>
                        {saving ? intl.formatMessage(messages.saving) : intl.formatMessage(messages.save)}
                    </Button>
                </div>
            ) : null}
            {pendingRemove ? (
                <ConfirmDialog
                    message={intl.formatMessage(messages.removeProjectConfirm, { name: pendingRemove.name })}
                    cancelLabel={intl.formatMessage(messages.removeProjectConfirmCancel)}
                    confirmLabel={intl.formatMessage(messages.removeProjectConfirmContinue)}
                    busy={removingId === pendingRemove.id}
                    onCancel={() => setPendingRemove(null)}
                    onConfirm={() => {
                        void confirmRemove();
                    }}
                />
            ) : null}
        </div>
    );
}
