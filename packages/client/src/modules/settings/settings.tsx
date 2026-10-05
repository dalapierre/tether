import { Button } from '@client/components/button';
import { ConfirmDialog } from '@client/components/confirm-dialog';
import { IconButton } from '@client/components/icon-button';
import { PageHeader } from '@client/components/page-header';
import { SearchSelect } from '@client/components/search-select';
import { Toggle } from '@client/components/toggle';
import { AGENTS, isAgentId, type AgentId } from '@client/libs/agents/agents';
import { ApiError } from '@client/libs/api/client';
import {
    addRepository,
    deleteRepository,
    listAvailableRepositories,
    listRepositories,
    type AvailableRepository,
    type Repository,
} from '@client/libs/api/repositories';
import { getSettings, updateSettings } from '@client/libs/api/settings';
import { clearAccessToken } from '@client/libs/auth/session';
import { showToast } from '@client/modules/toast';
import { useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';
import { messages } from './settings.messages';
import { styles } from './settings.styles';
import type { SettingsProps } from './settings.types';

type SettingsCategory = 'general' | 'repos' | 'agents';

function CategoryChevron() {
    return (
        <svg
            className={styles.categoryChevron}
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            aria-hidden='true'
        >
            <path strokeLinecap='round' strokeLinejoin='round' d='m8.25 4.5 7.5 7.5-7.5 7.5' />
        </svg>
    );
}

export function Settings({ onClose }: SettingsProps) {
    const intl = useIntl();
    const navigate = useNavigate();
    const [category, setCategory] = useState<SettingsCategory | null>(null);
    const [devDir, setDevDir] = useState('');
    const [agent, setAgent] = useState<AgentId>('cursor');
    const [yoloMode, setYoloMode] = useState(false);
    const [savedDevDir, setSavedDevDir] = useState('');
    const [savedAgent, setSavedAgent] = useState<AgentId>('cursor');
    const [savedYoloMode, setSavedYoloMode] = useState(false);
    const [repositories, setRepositories] = useState<Repository[]>([]);
    const [available, setAvailable] = useState<AvailableRepository[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [addingPath, setAddingPath] = useState<string | null>(null);
    const [pendingRemove, setPendingRemove] = useState<Repository | null>(null);
    const [removingId, setRemovingId] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        Promise.all([getSettings(), listRepositories()])
            .then(async ([settings, items]) => {
                if (cancelled) return;
                const nextAgent = isAgentId(settings.agent) ? settings.agent : 'cursor';
                const nextYoloMode = Boolean(settings.yoloMode);
                setDevDir(settings.devDir);
                setAgent(nextAgent);
                setYoloMode(nextYoloMode);
                setSavedDevDir(settings.devDir);
                setSavedAgent(nextAgent);
                setSavedYoloMode(nextYoloMode);
                setRepositories(items);

                try {
                    const availableItems = await listAvailableRepositories();
                    if (!cancelled) {
                        setAvailable(availableItems);
                    }
                } catch {
                    if (!cancelled) {
                        setAvailable([]);
                    }
                }
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
            if (pendingRemove) return;
            if (category) {
                setCategory(null);
                return;
            }
            onClose();
        }

        window.addEventListener('keydown', onKeyDown);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [category, onClose, pendingRemove]);

    const availableOptions = useMemo(
        () => available.map((repository) => ({ value: repository.path, label: repository.name })),
        [available],
    );

    const categoryCrumbLabel = useMemo(() => {
        if (category === 'general') return intl.formatMessage(messages.categoryGeneralCrumb);
        if (category === 'repos') return intl.formatMessage(messages.categoryReposCrumb);
        if (category === 'agents') return intl.formatMessage(messages.categoryAgentsCrumb);
        return null;
    }, [category, intl]);

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
            setSavedDevDir(settings.devDir);
            setSavedAgent(settings.agent);
            setSavedYoloMode(settings.yoloMode);
            showToast('settings-saved');

            try {
                const availableItems = await listAvailableRepositories();
                setAvailable(availableItems);
            } catch {
                // Keep the current available list if refresh fails.
            }
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

    async function handleAdd(path: string) {
        if (addingPath) return;

        setAddingPath(path);

        try {
            const repository = await addRepository(path);
            setRepositories((current) => [...current, repository].sort((a, b) => a.name.localeCompare(b.name)));
            setAvailable((current) => current.filter((item) => item.path !== path));
        } catch (err: unknown) {
            showToast(
                'generic-error',
                err instanceof Error ? err.message : intl.formatMessage(messages.addRepositoryFailed),
            );
        } finally {
            setAddingPath(null);
        }
    }

    async function confirmRemove() {
        const repository = pendingRemove;
        if (!repository || removingId) return;

        setRemovingId(repository.id);
        setPendingRemove(null);
        setRepositories((current) => current.filter((item) => item.id !== repository.id));

        try {
            await deleteRepository(repository.id);
            setAvailable((current) =>
                [...current, { name: repository.name, path: repository.path }].sort((a, b) =>
                    a.name.localeCompare(b.name),
                ),
            );
        } catch (err: unknown) {
            setRepositories((current) => [...current, repository].sort((a, b) => a.name.localeCompare(b.name)));
            showToast(
                'generic-error',
                err instanceof Error ? err.message : intl.formatMessage(messages.removeRepositoryFailed),
            );
        } finally {
            setRemovingId(null);
        }
    }

    const isDirty = devDir.trim() !== savedDevDir || agent !== savedAgent || yoloMode !== savedYoloMode;
    const showSave = (category === 'general' || category === 'agents') && isDirty;

    return (
        <div
            className={styles.root}
            role='dialog'
            aria-modal='true'
            aria-label={intl.formatMessage(messages.ariaLabel)}
        >
            <PageHeader
                crumbs={
                    category && categoryCrumbLabel
                        ? [
                              {
                                  label: intl.formatMessage(messages.crumb),
                                  onClick: () => setCategory(null),
                              },
                              { label: categoryCrumbLabel },
                          ]
                        : [{ label: intl.formatMessage(messages.crumb) }]
                }
                showSettings={false}
                actions={
                    <IconButton label={intl.formatMessage(messages.close)} onClick={onClose}>
                        ×
                    </IconButton>
                }
            />
            <div className={styles.body}>
                {category === null ? (
                    <>
                        <div className={styles.categories}>
                            <button
                                type='button'
                                className={styles.categoryButton}
                                onClick={() => setCategory('general')}
                            >
                                <span className={styles.categoryText}>
                                    <span className={styles.categoryLabel}>
                                        {intl.formatMessage(messages.categoryGeneral)}
                                    </span>
                                    <span className={styles.categoryDescription}>
                                        {intl.formatMessage(messages.categoryGeneralDescription)}
                                    </span>
                                </span>
                                <CategoryChevron />
                            </button>
                            <button
                                type='button'
                                className={styles.categoryButton}
                                onClick={() => setCategory('repos')}
                            >
                                <span className={styles.categoryText}>
                                    <span className={styles.categoryLabel}>
                                        {intl.formatMessage(messages.categoryRepos)}
                                    </span>
                                    <span className={styles.categoryDescription}>
                                        {intl.formatMessage(messages.categoryReposDescription)}
                                    </span>
                                </span>
                                <CategoryChevron />
                            </button>
                            <button
                                type='button'
                                className={styles.categoryButton}
                                onClick={() => setCategory('agents')}
                            >
                                <span className={styles.categoryText}>
                                    <span className={styles.categoryLabel}>
                                        {intl.formatMessage(messages.categoryAgents)}
                                    </span>
                                    <span className={styles.categoryDescription}>
                                        {intl.formatMessage(messages.categoryAgentsDescription)}
                                    </span>
                                </span>
                                <CategoryChevron />
                            </button>
                        </div>

                        <div className={styles.actions}>
                            <Button type='button' variant='secondary' onClick={onSignOut}>
                                {intl.formatMessage(messages.signOut)}
                            </Button>
                        </div>
                    </>
                ) : null}

                {category !== null && loading ? (
                    <p className={styles.loading}>{intl.formatMessage(messages.loading)}</p>
                ) : null}

                {category === 'general' && !loading ? (
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
                    </div>
                ) : null}

                {category === 'repos' && !loading ? (
                    <div className={styles.fields}>
                        <div>
                            <p className={styles.label}>{intl.formatMessage(messages.addRepositoryLabel)}</p>
                            <SearchSelect
                                options={availableOptions}
                                onSelect={(option) => {
                                    void handleAdd(option.value);
                                }}
                                placeholder={intl.formatMessage(messages.addRepositoryPlaceholder)}
                                emptyMessage={intl.formatMessage(messages.addRepositoryEmpty)}
                                noResultsMessage={intl.formatMessage(messages.addRepositoryNoResults)}
                                disabled={Boolean(addingPath)}
                                ariaLabel={intl.formatMessage(messages.addRepositoryLabel)}
                            />
                        </div>
                        <div className={styles.repositoriesList}>
                            <p className={styles.label}>{intl.formatMessage(messages.repositoriesLabel)}</p>
                            <div className={styles.repositories}>
                                {repositories.length === 0 ? (
                                    <p className={styles.repositoryEmpty}>
                                        {intl.formatMessage(messages.repositoriesEmpty)}
                                    </p>
                                ) : (
                                    repositories.map((repository) => (
                                        <div key={repository.id} className={styles.repositoryRow}>
                                            <span className={styles.repositoryName}>{repository.name}</span>
                                            <IconButton
                                                label={intl.formatMessage(messages.removeRepository)}
                                                disabled={removingId === repository.id}
                                                onClick={() => setPendingRemove(repository)}
                                            >
                                                ×
                                            </IconButton>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                ) : null}

                {category === 'agents' && !loading ? (
                    <div className={styles.fields}>
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

                        <Toggle
                            label={intl.formatMessage(messages.yoloModeLabel)}
                            description={intl.formatMessage(messages.yoloModeHint)}
                            checked={yoloMode}
                            onChange={setYoloMode}
                        />
                    </div>
                ) : null}
            </div>
            {showSave && !loading ? (
                <div className={styles.footer}>
                    <Button type='button' onClick={handleSave} disabled={saving}>
                        {saving ? intl.formatMessage(messages.saving) : intl.formatMessage(messages.save)}
                    </Button>
                </div>
            ) : null}
            {pendingRemove ? (
                <ConfirmDialog
                    message={intl.formatMessage(messages.removeRepositoryConfirm, { name: pendingRemove.name })}
                    cancelLabel={intl.formatMessage(messages.removeRepositoryConfirmCancel)}
                    confirmLabel={intl.formatMessage(messages.removeRepositoryConfirmContinue)}
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
