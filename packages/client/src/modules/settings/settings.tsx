import { Button } from '@client/components/button';
import { ConfirmDialog } from '@client/components/confirm-dialog';
import { IconButton } from '@client/components/icon-button';
import { PageHeader } from '@client/components/page-header';
import { SearchSelect } from '@client/components/search-select';
import { Toggle } from '@client/components/toggle';
import { agentLabelMessage, isAgentId, type AgentId } from '@client/libs/agents/agents';
import { listAvailableAgents, type AvailableAgent } from '@client/libs/api/agents';
import { ApiError } from '@client/libs/api/client';
import {
    addRepository,
    deleteRepository,
    listAvailableRepositories,
    listRepositories,
    type AvailableRepository,
    type Repository,
} from '@client/libs/api/repositories';
import { getSettings, updateSettings, type AgentProfile } from '@client/libs/api/settings';
import { DEFAULT_KEYBINDS, cloneKeybinds, keybindsEqual, type Keybinds } from '@client/libs/keybinds';
import { clearAccessToken } from '@client/libs/auth/session';
import { DEFAULT_TOAST_DURATION_SECONDS, setToastDurationSeconds, showToast } from '@client/modules/toast';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';
import { KeybindsPanel } from './keybindsPanel';
import { messages } from './settings.messages';
import { styles } from './settings.styles';
import type { SettingsProps } from './settings.types';

const MIN_TOAST_DURATION_SECONDS = 1;
const MAX_TOAST_DURATION_SECONDS = 120;
const DEFAULT_AUTH_TOKEN_EXPIRATION_MINUTES = 60;
const MIN_AUTH_TOKEN_EXPIRATION_MINUTES = 1;
const MAX_AUTH_TOKEN_EXPIRATION_MINUTES = 1440;

type SettingsView = 'root' | 'general' | 'repos' | 'agents' | 'profiles' | 'new-profile' | 'edit-profile' | 'keybinds';

type HeaderCrumb = {
    label: string;
    onClick?: () => void;
};

type ProfileDraft = {
    name: string;
    agent: AgentId;
    yoloMode: boolean;
    useWorktrees: boolean;
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

function emptyDraftProfile(defaultAgent: AgentId = 'cursor'): ProfileDraft {
    return {
        name: '',
        agent: defaultAgent,
        yoloMode: false,
        useWorktrees: true,
    };
}

function draftFromProfile(profile: AgentProfile): ProfileDraft {
    return {
        name: profile.name,
        agent: profile.agent,
        yoloMode: profile.yoloMode,
        useWorktrees: profile.useWorktrees,
    };
}

function profileDraftEquals(draft: ProfileDraft, profile: AgentProfile): boolean {
    return (
        draft.name.trim() === profile.name.trim() &&
        draft.agent === profile.agent &&
        draft.yoloMode === profile.yoloMode &&
        draft.useWorktrees === profile.useWorktrees
    );
}

function resolveHarnessIds(availableAgents: AvailableAgent[], selectedAgent: AgentId): AgentId[] {
    const ids = availableAgents.map((agent) => agent.id);
    if (!ids.includes(selectedAgent) && isAgentId(selectedAgent)) {
        return [selectedAgent, ...ids];
    }
    return ids;
}

function pickHarness(availableAgents: AvailableAgent[], preferred: AgentId): AgentId {
    if (availableAgents.some((agent) => agent.id === preferred)) {
        return preferred;
    }
    return availableAgents[0]?.id ?? preferred;
}

export function Settings({ onClose, onKeybindsSaved }: SettingsProps) {
    const intl = useIntl();
    const navigate = useNavigate();
    const [view, setView] = useState<SettingsView>('root');
    const [devDir, setDevDir] = useState('');
    const [toastDurationSeconds, setToastDurationSecondsState] = useState(DEFAULT_TOAST_DURATION_SECONDS);
    const [authTokenExpirationMinutes, setAuthTokenExpirationMinutes] = useState(DEFAULT_AUTH_TOKEN_EXPIRATION_MINUTES);
    const [defaultAgent, setDefaultAgent] = useState<AgentId>('cursor');
    const [defaultProfileId, setDefaultProfileId] = useState('');
    const [profiles, setProfiles] = useState<AgentProfile[]>([]);
    const [keybinds, setKeybinds] = useState<Keybinds>(() => cloneKeybinds(DEFAULT_KEYBINDS));
    const [savedDevDir, setSavedDevDir] = useState('');
    const [savedToastDurationSeconds, setSavedToastDurationSeconds] = useState(DEFAULT_TOAST_DURATION_SECONDS);
    const [savedAuthTokenExpirationMinutes, setSavedAuthTokenExpirationMinutes] = useState(
        DEFAULT_AUTH_TOKEN_EXPIRATION_MINUTES,
    );
    const [savedDefaultAgent, setSavedDefaultAgent] = useState<AgentId>('cursor');
    const [savedDefaultProfileId, setSavedDefaultProfileId] = useState('');
    const [savedKeybinds, setSavedKeybinds] = useState<Keybinds>(() => cloneKeybinds(DEFAULT_KEYBINDS));
    const [repositories, setRepositories] = useState<Repository[]>([]);
    const [available, setAvailable] = useState<AvailableRepository[]>([]);
    const [availableAgents, setAvailableAgents] = useState<AvailableAgent[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [creatingProfile, setCreatingProfile] = useState(false);
    const [savingProfile, setSavingProfile] = useState(false);
    const [draftProfile, setDraftProfile] = useState(() => emptyDraftProfile());
    const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
    const [addingPath, setAddingPath] = useState<string | null>(null);
    const [pendingRemoveRepo, setPendingRemoveRepo] = useState<Repository | null>(null);
    const [pendingRemoveProfile, setPendingRemoveProfile] = useState<AgentProfile | null>(null);
    const [pendingDiscard, setPendingDiscard] = useState(false);
    const [removingId, setRemovingId] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        Promise.all([getSettings(), listRepositories(), listAvailableAgents()])
            .then(async ([settings, items, agents]) => {
                if (cancelled) return;
                setDevDir(settings.devDir);
                setToastDurationSecondsState(settings.toastDurationSeconds);
                setAuthTokenExpirationMinutes(settings.authTokenExpirationMinutes);
                setDefaultAgent(settings.defaultAgent);
                setDefaultProfileId(settings.defaultProfileId);
                setProfiles(settings.profiles);
                setKeybinds(cloneKeybinds(settings.keybinds));
                setSavedDevDir(settings.devDir);
                setSavedToastDurationSeconds(settings.toastDurationSeconds);
                setSavedAuthTokenExpirationMinutes(settings.authTokenExpirationMinutes);
                setSavedDefaultAgent(settings.defaultAgent);
                setSavedDefaultProfileId(settings.defaultProfileId);
                setSavedKeybinds(cloneKeybinds(settings.keybinds));
                setToastDurationSeconds(settings.toastDurationSeconds);
                setRepositories(items);
                setAvailableAgents(agents);

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

    const goBack = useCallback(() => {
        if (view === 'new-profile' || view === 'edit-profile') {
            setView('profiles');
            setDraftProfile(emptyDraftProfile(pickHarness(availableAgents, defaultAgent)));
            setEditingProfileId(null);
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
    }, [availableAgents, defaultAgent, onClose, view]);

    const generalDirty =
        devDir.trim() !== savedDevDir ||
        toastDurationSeconds !== savedToastDurationSeconds ||
        authTokenExpirationMinutes !== savedAuthTokenExpirationMinutes;
    const agentsDirty = defaultAgent !== savedDefaultAgent || defaultProfileId !== savedDefaultProfileId;
    const keybindsDirty = !keybindsEqual(keybinds, savedKeybinds);
    const editingProfile = editingProfileId
        ? (profiles.find((profile) => profile.id === editingProfileId) ?? null)
        : null;
    const editProfileDirty =
        view === 'edit-profile' && editingProfile !== null && !profileDraftEquals(draftProfile, editingProfile);
    const hasUnsavedChanges =
        (view === 'general' && generalDirty) ||
        (view === 'agents' && agentsDirty) ||
        (view === 'keybinds' && keybindsDirty) ||
        editProfileDirty;

    function discardChanges() {
        if (view === 'general') {
            setDevDir(savedDevDir);
            setToastDurationSecondsState(savedToastDurationSeconds);
            setAuthTokenExpirationMinutes(savedAuthTokenExpirationMinutes);
        } else if (view === 'agents') {
            setDefaultAgent(savedDefaultAgent);
            setDefaultProfileId(savedDefaultProfileId);
        } else if (view === 'keybinds') {
            setKeybinds(cloneKeybinds(savedKeybinds));
        } else if (view === 'edit-profile' && editingProfile) {
            setDraftProfile(draftFromProfile(editingProfile));
        }
        setPendingDiscard(false);
    }

    useEffect(() => {
        function onKeyDown(event: KeyboardEvent) {
            if (event.key !== 'Escape') return;
            // Open confirm dialogs handle Escape themselves (closes / toggles off).
            if (pendingRemoveRepo || pendingRemoveProfile || pendingDiscard) return;
            if (hasUnsavedChanges) {
                event.preventDefault();
                setPendingDiscard(true);
                return;
            }
            goBack();
        }

        window.addEventListener('keydown', onKeyDown);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [goBack, hasUnsavedChanges, pendingDiscard, pendingRemoveProfile, pendingRemoveRepo]);

    const availableOptions = useMemo(
        () => available.map((repository) => ({ value: repository.path, label: repository.name })),
        [available],
    );

    const crumbs = useMemo((): HeaderCrumb[] => {
        const root: HeaderCrumb = {
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

        if (view === 'keybinds') {
            return [root, { label: intl.formatMessage(messages.categoryKeybindsCrumb) }];
        }

        const agentsCrumb: HeaderCrumb = {
            label: intl.formatMessage(messages.categoryAgentsCrumb),
            onClick: () => setView('agents'),
        };

        if (view === 'profiles') {
            return [root, agentsCrumb, { label: intl.formatMessage(messages.categoryProfilesCrumb) }];
        }

        const profilesCrumb: HeaderCrumb = {
            label: intl.formatMessage(messages.categoryProfilesCrumb),
            onClick: () => {
                setView('profiles');
                setDraftProfile(emptyDraftProfile(pickHarness(availableAgents, defaultAgent)));
                setEditingProfileId(null);
            },
        };

        if (view === 'edit-profile') {
            return [root, agentsCrumb, profilesCrumb, { label: intl.formatMessage(messages.categoryEditProfileCrumb) }];
        }

        return [root, agentsCrumb, profilesCrumb, { label: intl.formatMessage(messages.categoryNewProfileCrumb) }];
    }, [availableAgents, defaultAgent, intl, view]);

    async function persistProfiles(nextProfiles: AgentProfile[], nextDefaultProfileId: string): Promise<boolean> {
        try {
            const settings = await updateSettings({
                devDir: devDir.trim(),
                toastDurationSeconds,
                authTokenExpirationMinutes,
                defaultAgent,
                defaultProfileId: nextDefaultProfileId,
                profiles: nextProfiles,
                keybinds,
            });
            setDevDir(settings.devDir);
            setToastDurationSecondsState(settings.toastDurationSeconds);
            setAuthTokenExpirationMinutes(settings.authTokenExpirationMinutes);
            setDefaultAgent(settings.defaultAgent);
            setDefaultProfileId(settings.defaultProfileId);
            setProfiles(settings.profiles);
            setKeybinds(cloneKeybinds(settings.keybinds));
            setSavedDevDir(settings.devDir);
            setSavedToastDurationSeconds(settings.toastDurationSeconds);
            setSavedAuthTokenExpirationMinutes(settings.authTokenExpirationMinutes);
            setSavedDefaultAgent(settings.defaultAgent);
            setSavedDefaultProfileId(settings.defaultProfileId);
            setSavedKeybinds(cloneKeybinds(settings.keybinds));
            setToastDurationSeconds(settings.toastDurationSeconds);
            onKeybindsSaved?.(settings.keybinds);
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
            const nextProfiles =
                view === 'agents' && defaultAgent !== savedDefaultAgent
                    ? profiles.map((profile) =>
                          profile.id === defaultProfileId ? { ...profile, agent: defaultAgent } : profile,
                      )
                    : profiles;

            const settings = await updateSettings({
                devDir: devDir.trim(),
                toastDurationSeconds,
                authTokenExpirationMinutes,
                defaultAgent,
                defaultProfileId,
                profiles: nextProfiles,
                keybinds,
            });
            setDevDir(settings.devDir);
            setToastDurationSecondsState(settings.toastDurationSeconds);
            setAuthTokenExpirationMinutes(settings.authTokenExpirationMinutes);
            setDefaultAgent(settings.defaultAgent);
            setDefaultProfileId(settings.defaultProfileId);
            setProfiles(settings.profiles);
            setKeybinds(cloneKeybinds(settings.keybinds));
            setSavedDevDir(settings.devDir);
            setSavedToastDurationSeconds(settings.toastDurationSeconds);
            setSavedAuthTokenExpirationMinutes(settings.authTokenExpirationMinutes);
            setSavedDefaultAgent(settings.defaultAgent);
            setSavedDefaultProfileId(settings.defaultProfileId);
            setSavedKeybinds(cloneKeybinds(settings.keybinds));
            setToastDurationSeconds(settings.toastDurationSeconds);
            onKeybindsSaved?.(settings.keybinds);
            showToast('settings-saved');

            try {
                const [availableItems, agents] = await Promise.all([
                    listAvailableRepositories(),
                    listAvailableAgents(),
                ]);
                setAvailable(availableItems);
                setAvailableAgents(agents);
            } catch {
                // Keep the current lists if refresh fails.
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

    function openEditProfile(profile: AgentProfile) {
        setEditingProfileId(profile.id);
        setDraftProfile(draftFromProfile(profile));
        setView('edit-profile');
    }

    async function handleCreateProfile() {
        const name = draftProfile.name.trim();
        if (!name || creatingProfile) return;

        const nextProfile: AgentProfile = {
            id: createLocalProfileId(profiles),
            name,
            agent: draftProfile.agent,
            yoloMode: draftProfile.yoloMode,
            useWorktrees: draftProfile.useWorktrees,
        };
        const nextProfiles = [...profiles, nextProfile];
        const nextDefault = defaultProfileId || nextProfile.id;

        setCreatingProfile(true);
        const ok = await persistProfiles(nextProfiles, nextDefault);
        setCreatingProfile(false);

        if (!ok) return;

        setDraftProfile(emptyDraftProfile(pickHarness(availableAgents, defaultAgent)));
        setView('profiles');
    }

    async function handleSaveProfile() {
        const name = draftProfile.name.trim();
        if (!name || !editingProfileId || savingProfile) return;

        const nextProfiles = profiles.map((profile) =>
            profile.id === editingProfileId
                ? {
                      ...profile,
                      name,
                      agent: draftProfile.agent,
                      yoloMode: draftProfile.yoloMode,
                      useWorktrees: draftProfile.useWorktrees,
                  }
                : profile,
        );

        setSavingProfile(true);
        const ok = await persistProfiles(nextProfiles, defaultProfileId);
        setSavingProfile(false);

        if (!ok) return;

        setDraftProfile(emptyDraftProfile(pickHarness(availableAgents, defaultAgent)));
        setEditingProfileId(null);
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

    const showSaveButton =
        !loading &&
        ((view === 'general' && generalDirty) ||
            (view === 'agents' && agentsDirty) ||
            (view === 'keybinds' && keybindsDirty));
    const canCreateProfile = draftProfile.name.trim().length > 0 && !creatingProfile;
    const profileFormBusy = creatingProfile || savingProfile;
    const canSaveProfile =
        editProfileDirty && draftProfile.name.trim().length > 0 && !savingProfile && Boolean(editingProfile);
    const showProfileForm = (view === 'new-profile' || view === 'edit-profile') && !loading;
    const harnessOptions = useMemo(
        () => resolveHarnessIds(availableAgents, draftProfile.agent),
        [availableAgents, draftProfile.agent],
    );
    const defaultHarnessOptions = useMemo(
        () => resolveHarnessIds(availableAgents, defaultAgent),
        [availableAgents, defaultAgent],
    );

    const sectionHeader = useMemo(() => {
        switch (view) {
            case 'root':
                return {
                    title: intl.formatMessage(messages.rootTitle),
                    description: intl.formatMessage(messages.rootDescription),
                };
            case 'general':
                return {
                    title: intl.formatMessage(messages.categoryGeneral),
                    description: intl.formatMessage(messages.categoryGeneralDescription),
                };
            case 'repos':
                return {
                    title: intl.formatMessage(messages.categoryRepos),
                    description: intl.formatMessage(messages.categoryReposDescription),
                };
            case 'agents':
                return {
                    title: intl.formatMessage(messages.categoryAgents),
                    description: intl.formatMessage(messages.categoryAgentsDescription),
                };
            case 'keybinds':
                return {
                    title: intl.formatMessage(messages.categoryKeybinds),
                    description: intl.formatMessage(messages.categoryKeybindsDescription),
                };
            case 'profiles':
                return {
                    title: intl.formatMessage(messages.categoryProfiles),
                    description: intl.formatMessage(messages.categoryProfilesDescription),
                };
            case 'new-profile':
                return {
                    title: intl.formatMessage(messages.categoryNewProfile),
                    description: intl.formatMessage(messages.categoryNewProfileDescription),
                };
            case 'edit-profile':
                return {
                    title: intl.formatMessage(messages.categoryEditProfile),
                    description: intl.formatMessage(messages.categoryEditProfileDescription),
                };
        }
    }, [intl, view]);

    return (
        <div
            className={styles.root}
            role='dialog'
            aria-modal='true'
            aria-label={intl.formatMessage(messages.ariaLabel)}
            onClick={(event) => {
                if (event.target === event.currentTarget) {
                    onClose();
                }
            }}
        >
            <div className={styles.shell}>
                <PageHeader
                    crumbs={crumbs}
                    showSettings={false}
                    onBack={view === 'root' ? undefined : goBack}
                    onHomeClick={onClose}
                    actions={
                        <IconButton label={intl.formatMessage(messages.close)} onClick={onClose}>
                            ×
                        </IconButton>
                    }
                />
                <div className={styles.body}>
                    {!loading || view === 'root' ? (
                        <div className={styles.sectionHeader}>
                            <h2 className={styles.sectionTitle}>{sectionHeader.title}</h2>
                            <p className={styles.sectionDescription}>{sectionHeader.description}</p>
                        </div>
                    ) : null}

                    {view === 'root' ? (
                        <>
                            <div className={styles.categories}>
                                <button
                                    type='button'
                                    className={styles.categoryButton}
                                    onClick={() => setView('general')}
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
                                    onClick={() => setView('repos')}
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
                                    onClick={() => setView('agents')}
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
                                <button
                                    type='button'
                                    className={styles.categoryButton}
                                    onClick={() => setView('keybinds')}
                                >
                                    <span className={styles.categoryText}>
                                        <span className={styles.categoryLabel}>
                                            {intl.formatMessage(messages.categoryKeybinds)}
                                        </span>
                                        <span className={styles.categoryDescription}>
                                            {intl.formatMessage(messages.categoryKeybindsDescription)}
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
                                    autoCapitalize='off'
                                    autoCorrect='off'
                                    spellCheck={false}
                                />
                            </label>
                            <p className={styles.hint}>{intl.formatMessage(messages.devDirHint)}</p>

                            <label className={styles.inlineField}>
                                <span className={styles.inlineFieldText}>
                                    <span className={styles.inlineFieldLabel}>
                                        {intl.formatMessage(messages.toastDurationLabel)}
                                    </span>
                                    <span className={styles.inlineFieldHint}>
                                        {intl.formatMessage(messages.toastDurationHint)}
                                    </span>
                                </span>
                                <input
                                    className={styles.inlineFieldInput}
                                    type='number'
                                    min={MIN_TOAST_DURATION_SECONDS}
                                    max={MAX_TOAST_DURATION_SECONDS}
                                    step={1}
                                    value={toastDurationSeconds}
                                    onChange={(event) => {
                                        const next = Number(event.target.value);
                                        if (!Number.isFinite(next)) return;
                                        setToastDurationSecondsState(
                                            Math.min(
                                                MAX_TOAST_DURATION_SECONDS,
                                                Math.max(MIN_TOAST_DURATION_SECONDS, Math.round(next)),
                                            ),
                                        );
                                    }}
                                />
                            </label>

                            <label className={styles.inlineField}>
                                <span className={styles.inlineFieldText}>
                                    <span className={styles.inlineFieldLabel}>
                                        {intl.formatMessage(messages.authTokenExpirationLabel)}
                                    </span>
                                    <span className={styles.inlineFieldHint}>
                                        {intl.formatMessage(messages.authTokenExpirationHint)}
                                    </span>
                                </span>
                                <input
                                    className={styles.inlineFieldInput}
                                    type='number'
                                    min={MIN_AUTH_TOKEN_EXPIRATION_MINUTES}
                                    max={MAX_AUTH_TOKEN_EXPIRATION_MINUTES}
                                    step={1}
                                    value={authTokenExpirationMinutes}
                                    onChange={(event) => {
                                        const next = Number(event.target.value);
                                        if (!Number.isFinite(next)) return;
                                        setAuthTokenExpirationMinutes(
                                            Math.min(
                                                MAX_AUTH_TOKEN_EXPIRATION_MINUTES,
                                                Math.max(MIN_AUTH_TOKEN_EXPIRATION_MINUTES, Math.round(next)),
                                            ),
                                        );
                                    }}
                                />
                            </label>
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
                                {intl.formatMessage(messages.defaultHarnessLabel)}
                                <select
                                    className={styles.select}
                                    value={defaultAgent}
                                    onChange={(event) => {
                                        const next = event.target.value;
                                        if (defaultHarnessOptions.includes(next as AgentId)) {
                                            setDefaultAgent(next as AgentId);
                                        }
                                    }}
                                    disabled={defaultHarnessOptions.length === 0}
                                >
                                    {defaultHarnessOptions.length === 0 ? (
                                        <option value={defaultAgent}>
                                            {intl.formatMessage(messages.harnessesEmpty)}
                                        </option>
                                    ) : (
                                        defaultHarnessOptions.map((agentId) => (
                                            <option key={agentId} value={agentId}>
                                                {intl.formatMessage(agentLabelMessage(agentId))}
                                            </option>
                                        ))
                                    )}
                                </select>
                            </label>

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
                                <button
                                    type='button'
                                    className={styles.categoryButton}
                                    onClick={() => setView('profiles')}
                                >
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

                    {view === 'keybinds' && !loading ? (
                        <KeybindsPanel keybinds={keybinds} onChange={setKeybinds} disabled={saving} />
                    ) : null}

                    {view === 'profiles' && !loading ? (
                        <div className={styles.fields}>
                            <p className={styles.label}>{intl.formatMessage(messages.profilesLabel)}</p>
                            <div className={styles.repositories}>
                                {profiles.length === 0 ? (
                                    <p className={styles.repositoryEmpty}>
                                        {intl.formatMessage(messages.profilesEmpty)}
                                    </p>
                                ) : (
                                    profiles.map((profile) => (
                                        <div key={profile.id} className={styles.profileRow}>
                                            <button
                                                type='button'
                                                className={styles.profileRowButton}
                                                onClick={() => openEditProfile(profile)}
                                            >
                                                {profile.name.trim() || profile.id}
                                            </button>
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
                    ) : null}

                    {showProfileForm ? (
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
                                    autoCapitalize='off'
                                    autoCorrect='off'
                                    spellCheck={false}
                                    autoFocus
                                    disabled={profileFormBusy}
                                />
                            </label>

                            <label className={styles.label}>
                                {intl.formatMessage(messages.profileHarnessLabel)}
                                <select
                                    className={styles.select}
                                    value={draftProfile.agent}
                                    disabled={profileFormBusy || harnessOptions.length === 0}
                                    onChange={(event) => {
                                        const next = event.target.value;
                                        if (harnessOptions.includes(next as AgentId)) {
                                            setDraftProfile((current) => ({ ...current, agent: next as AgentId }));
                                        }
                                    }}
                                >
                                    {harnessOptions.length === 0 ? (
                                        <option value={draftProfile.agent}>
                                            {intl.formatMessage(messages.harnessesEmpty)}
                                        </option>
                                    ) : (
                                        harnessOptions.map((agentId) => (
                                            <option key={agentId} value={agentId}>
                                                {intl.formatMessage(agentLabelMessage(agentId))}
                                            </option>
                                        ))
                                    )}
                                </select>
                            </label>

                            <Toggle
                                label={intl.formatMessage(messages.profileYoloModeLabel)}
                                description={intl.formatMessage(messages.profileYoloModeHint)}
                                checked={draftProfile.yoloMode}
                                disabled={profileFormBusy}
                                onChange={(checked) =>
                                    setDraftProfile((current) => ({ ...current, yoloMode: checked }))
                                }
                            />

                            <Toggle
                                label={intl.formatMessage(messages.profileUseWorktreesLabel)}
                                description={intl.formatMessage(messages.profileUseWorktreesHint)}
                                checked={draftProfile.useWorktrees}
                                disabled={profileFormBusy}
                                onChange={(checked) =>
                                    setDraftProfile((current) => ({ ...current, useWorktrees: checked }))
                                }
                            />
                        </div>
                    ) : null}
                </div>
                {showSaveButton ? (
                    <div className={styles.footer}>
                        <div className={styles.footerActions}>
                            <div className={styles.footerAction}>
                                <Button
                                    type='button'
                                    variant='secondary'
                                    onClick={() => setPendingDiscard(true)}
                                    disabled={saving}
                                >
                                    {intl.formatMessage(messages.cancel)}
                                </Button>
                            </div>
                            <div className={styles.footerAction}>
                                <Button type='button' onClick={() => void handleSave()} disabled={saving}>
                                    {saving ? intl.formatMessage(messages.saving) : intl.formatMessage(messages.save)}
                                </Button>
                            </div>
                        </div>
                    </div>
                ) : null}
                {view === 'profiles' && !loading ? (
                    <div className={styles.footer}>
                        <Button
                            type='button'
                            onClick={() => {
                                setEditingProfileId(null);
                                setDraftProfile(emptyDraftProfile(pickHarness(availableAgents, defaultAgent)));
                                setView('new-profile');
                            }}
                        >
                            {intl.formatMessage(messages.addProfile)}
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
                {view === 'edit-profile' && !loading && canSaveProfile ? (
                    <div className={styles.footer}>
                        <div className={styles.footerActions}>
                            <div className={styles.footerAction}>
                                <Button
                                    type='button'
                                    variant='secondary'
                                    onClick={() => setPendingDiscard(true)}
                                    disabled={savingProfile}
                                >
                                    {intl.formatMessage(messages.cancel)}
                                </Button>
                            </div>
                            <div className={styles.footerAction}>
                                <Button type='button' onClick={() => void handleSaveProfile()} disabled={savingProfile}>
                                    {savingProfile
                                        ? intl.formatMessage(messages.saving)
                                        : intl.formatMessage(messages.save)}
                                </Button>
                            </div>
                        </div>
                    </div>
                ) : null}
            </div>
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
            {pendingDiscard ? (
                <ConfirmDialog
                    message={intl.formatMessage(messages.discardChangesConfirm)}
                    cancelLabel={intl.formatMessage(messages.cancel)}
                    confirmLabel={intl.formatMessage(messages.discardChangesConfirmContinue)}
                    onCancel={() => setPendingDiscard(false)}
                    onConfirm={discardChanges}
                />
            ) : null}
        </div>
    );
}
