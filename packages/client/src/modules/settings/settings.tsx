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
import { getSettings, updateSettings, type AgentProfile, type AgentProfileType } from '@client/libs/api/settings';
import { clearAccessToken } from '@client/libs/auth/session';
import { showToast } from '@client/modules/toast';
import { useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';
import { messages } from './settings.messages';
import { styles } from './settings.styles';
import type { SettingsProps } from './settings.types';

type SettingsView = 'root' | 'general' | 'repos' | 'agents' | 'profiles' | 'new-profile';

type PageHeaderCrumb = {
    label: string;
    onClick?: () => void;
};

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

function createLocalProfileId(existing: AgentProfile[]): string {
    const taken = new Set(existing.map((profile) => profile.id));
    let index = existing.length + 1;
    let id = `profile-${index}`;
    while (taken.has(id)) {
        index += 1;
        id = `profile-${index}`;
    }
    return id;
}

function emptyDraftProfile(): {
    name: string;
    type: AgentProfileType;
    agent: AgentId;
    yoloMode: boolean;
} {
    return {
        name: '',
        type: 'coding',
        agent: 'cursor',
        yoloMode: false,
    };
}

export function Settings({ onClose }: SettingsProps) {
    const intl = useIntl();
    const navigate = useNavigate();
    const [view, setView] = useState<SettingsView>('root');
    const [devDir, setDevDir] = useState('');
    const [defaultProfileId, setDefaultProfileId] = useState('');
    const [profiles, setProfiles] = useState<AgentProfile[]>([]);
    const [savedDevDir, setSavedDevDir] = useState('');
    const [savedDefaultProfileId, setSavedDefaultProfileId] = useState('');
    const [repositories, setRepositories] = useState<Repository[]>([]);
    const [available, setAvailable] = useState<AvailableRepository[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [creatingProfile, setCreatingProfile] = useState(false);
    const [draftProfile, setDraftProfile] = useState(emptyDraftProfile);
    const [addingPath, setAddingPath] = useState<string | null>(null);
    const [pendingRemoveRepo, setPendingRemoveRepo] = useState<Repository | null>(null);
    const [pendingRemoveProfile, setPendingRemoveProfile] = useState<AgentProfile | null>(null);
    const [removingId, setRemovingId] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        Promise.all([getSettings(), listRepositories()])
            .then(async ([settings, items]) => {
                if (cancelled) return;
                setDevDir(settings.devDir);
                setDefaultProfileId(settings.defaultProfileId);
                setProfiles(settings.profiles);
                setSavedDevDir(settings.devDir);
                setSavedDefaultProfileId(settings.defaultProfileId);
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
            if (pendingRemoveRepo || pendingRemoveProfile) return;
            if (view === 'new-profile') {
                setView('profiles');
                setDraftProfile(emptyDraftProfile());
                return;
            }
            if (view === 'profiles') {
                setView('agents');
                return;
            }
            if (view !== 'root') {
                setView('root');
                return;
            }
            onClose();
        }

        window.addEventListener('keydown', onKeyDown);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [onClose, pendingRemoveProfile, pendingRemoveRepo, view]);

    const availableOptions = useMemo(
        () => available.map((repository) => ({ value: repository.path, label: repository.name })),
        [available],
    );

    const crumbs = useMemo((): PageHeaderCrumb[] => {
        const root: PageHeaderCrumb = {
            label: intl.formatMessage(messages.crumb),
            onClick: view === 'root' ? undefined : () => setView('root'),
        };

        if (view === 'root') {
            return [root];
        }

        if (view === 'general') {
            return [root, { label: intl.formatMessage(messages.categoryGeneralCrumb) }];
        }

        if (view === 'repos') {
            return [root, { label: intl.formatMessage(messages.categoryReposCrumb) }];
        }

        if (view === 'agents') {
            return [root, { label: intl.formatMessage(messages.categoryAgentsCrumb) }];
        }

        const agentsCrumb: PageHeaderCrumb = {
            label: intl.formatMessage(messages.categoryAgentsCrumb),
            onClick: () => setView('agents'),
        };

        if (view === 'profiles') {
            return [root, agentsCrumb, { label: intl.formatMessage(messages.categoryProfilesCrumb) }];
        }

        return [
            root,
            agentsCrumb,
            {
                label: intl.formatMessage(messages.categoryProfilesCrumb),
                onClick: () => {
                    setView('profiles');
                    setDraftProfile(emptyDraftProfile());
                },
            },
            { label: intl.formatMessage(messages.categoryNewProfileCrumb) },
        ];
    }, [intl, view]);

    async function persistProfiles(nextProfiles: AgentProfile[], nextDefaultProfileId: string): Promise<boolean> {
        try {
            const settings = await updateSettings({
                devDir: devDir.trim(),
                defaultProfileId: nextDefaultProfileId,
                profiles: nextProfiles,
            });
            setDevDir(settings.devDir);
            setDefaultProfileId(settings.defaultProfileId);
            setProfiles(settings.profiles);
            setSavedDevDir(settings.devDir);
            setSavedDefaultProfileId(settings.defaultProfileId);
            return true;
        } catch (err: unknown) {
            if (err instanceof ApiError) {
                showToast('generic-error', err.message);
            } else {
                showToast(
                    'generic-error',
                    err instanceof Error ? err.message : intl.formatMessage(messages.saveFailed),
                );
            }
            return false;
        }
    }

    async function handleSave() {
        setSaving(true);

        try {
            const settings = await updateSettings({
                devDir: devDir.trim(),
                defaultProfileId,
                profiles,
            });
            setDevDir(settings.devDir);
            setDefaultProfileId(settings.defaultProfileId);
            setProfiles(settings.profiles);
            setSavedDevDir(settings.devDir);
            setSavedDefaultProfileId(settings.defaultProfileId);
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

    async function handleCreateProfile() {
        const name = draftProfile.name.trim();
        if (!name || creatingProfile) return;

        const nextProfile: AgentProfile = {
            id: createLocalProfileId(profiles),
            name,
            type: draftProfile.type,
            agent: draftProfile.agent,
            yoloMode: draftProfile.yoloMode,
        };
        const nextProfiles = [...profiles, nextProfile];
        const nextDefault = defaultProfileId || nextProfile.id;

        setCreatingProfile(true);
        const ok = await persistProfiles(nextProfiles, nextDefault);
        setCreatingProfile(false);

        if (!ok) return;

        setDraftProfile(emptyDraftProfile());
        setView('profiles');
    }

    async function confirmRemoveProfile() {
        const profile = pendingRemoveProfile;
        if (!profile || removingId) return;
        if (profiles.length <= 1) {
            setPendingRemoveProfile(null);
            return;
        }

        const nextProfiles = profiles.filter((item) => item.id !== profile.id);
        const nextDefault = defaultProfileId === profile.id ? (nextProfiles[0]?.id ?? '') : defaultProfileId;

        setRemovingId(profile.id);
        setPendingRemoveProfile(null);

        const ok = await persistProfiles(nextProfiles, nextDefault);
        if (!ok) {
            showToast('generic-error', intl.formatMessage(messages.removeProfileFailed));
        }
        setRemovingId(null);
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

    async function confirmRemoveRepo() {
        const repository = pendingRemoveRepo;
        if (!repository || removingId) return;

        setRemovingId(repository.id);
        setPendingRemoveRepo(null);
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

    const generalDirty = devDir.trim() !== savedDevDir;
    const agentsDirty = defaultProfileId !== savedDefaultProfileId;
    const showSaveButton = !loading && ((view === 'general' && generalDirty) || (view === 'agents' && agentsDirty));
    const canCreateProfile = draftProfile.name.trim().length > 0 && !creatingProfile;

    return (
        <div
            className={styles.root}
            role='dialog'
            aria-modal='true'
            aria-label={intl.formatMessage(messages.ariaLabel)}
        >
            <PageHeader
                crumbs={crumbs}
                showSettings={false}
                actions={
                    <IconButton label={intl.formatMessage(messages.close)} onClick={onClose}>
                        ×
                    </IconButton>
                }
            />
            <div className={styles.body}>
                {view === 'root' ? (
                    <>
                        <div className={styles.categories}>
                            <button type='button' className={styles.categoryButton} onClick={() => setView('general')}>
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
                            <button type='button' className={styles.categoryButton} onClick={() => setView('repos')}>
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
                            <button type='button' className={styles.categoryButton} onClick={() => setView('agents')}>
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

                {view !== 'root' && loading ? (
                    <p className={styles.loading}>{intl.formatMessage(messages.loading)}</p>
                ) : null}

                {view === 'general' && !loading ? (
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

                {view === 'repos' && !loading ? (
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
                                                onClick={() => setPendingRemoveRepo(repository)}
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

                {view === 'agents' && !loading ? (
                    <div className={styles.fields}>
                        <label className={styles.label}>
                            {intl.formatMessage(messages.defaultProfileLabel)}
                            <select
                                className={styles.select}
                                value={defaultProfileId}
                                onChange={(event) => setDefaultProfileId(event.target.value)}
                            >
                                {profiles.map((profile) => (
                                    <option key={profile.id} value={profile.id}>
                                        {profile.name.trim() || profile.id}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <div className={styles.categories}>
                            <button type='button' className={styles.categoryButton} onClick={() => setView('profiles')}>
                                <span className={styles.categoryText}>
                                    <span className={styles.categoryLabel}>
                                        {intl.formatMessage(messages.categoryProfiles)}
                                    </span>
                                    <span className={styles.categoryDescription}>
                                        {intl.formatMessage(messages.categoryProfilesDescription)}
                                    </span>
                                </span>
                                <CategoryChevron />
                            </button>
                        </div>
                    </div>
                ) : null}

                {view === 'profiles' && !loading ? (
                    <div className={styles.fields}>
                        <Button
                            type='button'
                            onClick={() => {
                                setDraftProfile(emptyDraftProfile());
                                setView('new-profile');
                            }}
                        >
                            {intl.formatMessage(messages.addProfile)}
                        </Button>

                        <div className={styles.repositoriesList}>
                            <p className={styles.label}>{intl.formatMessage(messages.profilesLabel)}</p>
                            <div className={styles.repositories}>
                                {profiles.length === 0 ? (
                                    <p className={styles.repositoryEmpty}>
                                        {intl.formatMessage(messages.profilesEmpty)}
                                    </p>
                                ) : (
                                    profiles.map((profile) => (
                                        <div key={profile.id} className={styles.repositoryRow}>
                                            <span className={styles.repositoryName}>
                                                {profile.name.trim() || profile.id}
                                            </span>
                                            <IconButton
                                                label={intl.formatMessage(messages.removeProfile)}
                                                disabled={profiles.length <= 1 || removingId === profile.id}
                                                onClick={() => setPendingRemoveProfile(profile)}
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

                {view === 'new-profile' && !loading ? (
                    <div className={styles.fields}>
                        <label className={styles.label}>
                            {intl.formatMessage(messages.profileNameLabel)}
                            <input
                                className={styles.input}
                                type='text'
                                value={draftProfile.name}
                                onChange={(event) =>
                                    setDraftProfile((current) => ({ ...current, name: event.target.value }))
                                }
                                placeholder={intl.formatMessage(messages.profileNamePlaceholder)}
                                autoComplete='off'
                                spellCheck={false}
                                autoFocus
                                disabled={creatingProfile}
                            />
                        </label>

                        <label className={styles.label}>
                            {intl.formatMessage(messages.profileTypeLabel)}
                            <select
                                className={styles.select}
                                value={draftProfile.type}
                                disabled={creatingProfile}
                                onChange={(event) => {
                                    const next = event.target.value;
                                    if (next === 'coding' || next === 'conversation') {
                                        setDraftProfile((current) => ({ ...current, type: next }));
                                    }
                                }}
                            >
                                <option value='coding'>{intl.formatMessage(messages.profileTypeCoding)}</option>
                                <option value='conversation'>
                                    {intl.formatMessage(messages.profileTypeConversation)}
                                </option>
                            </select>
                        </label>

                        <label className={styles.label}>
                            {intl.formatMessage(messages.profileHarnessLabel)}
                            <select
                                className={styles.select}
                                value={draftProfile.agent}
                                disabled={creatingProfile}
                                onChange={(event) => {
                                    const next = event.target.value;
                                    if (isAgentId(next)) {
                                        setDraftProfile((current) => ({ ...current, agent: next }));
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
                            label={intl.formatMessage(messages.profileYoloModeLabel)}
                            description={intl.formatMessage(messages.profileYoloModeHint)}
                            checked={draftProfile.yoloMode}
                            disabled={creatingProfile}
                            onChange={(checked) => setDraftProfile((current) => ({ ...current, yoloMode: checked }))}
                        />
                    </div>
                ) : null}
            </div>
            {showSaveButton ? (
                <div className={styles.footer}>
                    <Button type='button' onClick={() => void handleSave()} disabled={saving}>
                        {saving ? intl.formatMessage(messages.saving) : intl.formatMessage(messages.save)}
                    </Button>
                </div>
            ) : null}
            {view === 'new-profile' && !loading ? (
                <div className={styles.footer}>
                    <Button type='button' onClick={() => void handleCreateProfile()} disabled={!canCreateProfile}>
                        {intl.formatMessage(creatingProfile ? messages.creatingProfile : messages.createProfile)}
                    </Button>
                </div>
            ) : null}
            {pendingRemoveRepo ? (
                <ConfirmDialog
                    message={intl.formatMessage(messages.removeRepositoryConfirm, {
                        name: pendingRemoveRepo.name,
                    })}
                    cancelLabel={intl.formatMessage(messages.removeRepositoryConfirmCancel)}
                    confirmLabel={intl.formatMessage(messages.removeRepositoryConfirmContinue)}
                    busy={removingId === pendingRemoveRepo.id}
                    onCancel={() => setPendingRemoveRepo(null)}
                    onConfirm={() => {
                        void confirmRemoveRepo();
                    }}
                />
            ) : null}
            {pendingRemoveProfile ? (
                <ConfirmDialog
                    message={intl.formatMessage(messages.removeProfileConfirm, {
                        name: pendingRemoveProfile.name.trim() || pendingRemoveProfile.id,
                    })}
                    cancelLabel={intl.formatMessage(messages.removeProfileConfirmCancel)}
                    confirmLabel={intl.formatMessage(messages.removeProfileConfirmContinue)}
                    busy={removingId === pendingRemoveProfile.id}
                    onCancel={() => setPendingRemoveProfile(null)}
                    onConfirm={() => {
                        void confirmRemoveProfile();
                    }}
                />
            ) : null}
        </div>
    );
}
