import { Button } from '@client/components/button';
import { IconButton } from '@client/components/icon-button';
import { PageHeader } from '@client/components/page-header';
import { SearchSelect } from '@client/components/search-select';
import { Spinner } from '@client/components/spinner';
import {
    listRepositories,
    listRepositoryBranches,
    prefetchRepositoryDirectories,
    type Repository,
} from '@client/libs/api/repositories';
import { createSession } from '@client/libs/api/sessions';
import { getSettings, type AgentProfile } from '@client/libs/api/settings';
import { isValidBranchName } from '@client/libs/git/branchName';
import { showToast } from '@client/modules/toast';
import { useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { messages } from './newSession.messages';
import { styles } from './newSession.styles';
import type { NewSessionProps } from './newSession.types';

const DEFAULT_WORKING_DIRECTORY = '/';

function AdvancedChevron({ open }: { open: boolean }) {
    return (
        <svg
            className={open ? styles.advancedChevronOpen : styles.advancedChevron}
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            aria-hidden='true'
        >
            <path strokeLinecap='round' strokeLinejoin='round' d='m19.5 8.25-7.5 7.5-7.5-7.5' />
        </svg>
    );
}

export function NewSession({ onClose, onStarted }: NewSessionProps) {
    const intl = useIntl();
    const [name, setName] = useState('');
    const [profileId, setProfileId] = useState('');
    const [repositoryId, setRepositoryId] = useState('');
    const [branch, setBranch] = useState('');
    const [branches, setBranches] = useState<string[]>([]);
    const [workingDirectory, setWorkingDirectory] = useState(DEFAULT_WORKING_DIRECTORY);
    const [directories, setDirectories] = useState<string[]>([DEFAULT_WORKING_DIRECTORY]);
    const [advancedOpen, setAdvancedOpen] = useState(false);
    const [profiles, setProfiles] = useState<AgentProfile[]>([]);
    const [repositories, setRepositories] = useState<Repository[]>([]);
    const [loading, setLoading] = useState(true);
    const [starting, setStarting] = useState(false);

    useEffect(() => {
        let cancelled = false;

        Promise.all([getSettings(), listRepositories()])
            .then(([settings, items]) => {
                if (cancelled) return;
                setProfiles(settings.profiles);
                setProfileId(settings.defaultProfileId);
                setRepositories(items);
                if (items.length === 1) {
                    setRepositoryId(items[0].id);
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
        if (!repositoryId) {
            setBranches([]);
            setDirectories([DEFAULT_WORKING_DIRECTORY]);
            setWorkingDirectory(DEFAULT_WORKING_DIRECTORY);
            return;
        }

        let cancelled = false;
        setBranches([]);
        setDirectories([DEFAULT_WORKING_DIRECTORY]);
        setWorkingDirectory(DEFAULT_WORKING_DIRECTORY);

        listRepositoryBranches(repositoryId)
            .then((branchItems) => {
                if (!cancelled) {
                    setBranches(branchItems);
                }
            })
            .catch((err: unknown) => {
                if (!cancelled) {
                    setBranches([]);
                    showToast(
                        'generic-error',
                        err instanceof Error ? err.message : intl.formatMessage(messages.loadFailed),
                    );
                }
            });

        // Warm directory options in the background so Advanced is ready on large monorepos.
        prefetchRepositoryDirectories(repositoryId)
            .then((directoryItems) => {
                if (!cancelled) {
                    setDirectories(directoryItems.length > 0 ? directoryItems : [DEFAULT_WORKING_DIRECTORY]);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setDirectories([DEFAULT_WORKING_DIRECTORY]);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [repositoryId, intl]);

    useEffect(() => {
        function onKeyDown(event: KeyboardEvent) {
            if (event.key !== 'Escape') return;
            // Block dismiss while the session is spawning.
            event.preventDefault();
            if (starting) return;
            onClose();
        }

        window.addEventListener('keydown', onKeyDown);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [onClose, starting]);

    const selectedProfile = useMemo(
        () => profiles.find((profile) => profile.id === profileId) ?? null,
        [profiles, profileId],
    );

    const profileOptions = useMemo(
        () => profiles.map((profile) => ({ value: profile.id, label: profile.name })),
        [profiles],
    );

    const repositoryOptions = useMemo(
        () => repositories.map((repository) => ({ value: repository.id, label: repository.name })),
        [repositories],
    );

    const branchOptions = useMemo(
        () => branches.map((branchName) => ({ value: branchName, label: branchName })),
        [branches],
    );

    const directoryOptions = useMemo(
        () => directories.map((directory) => ({ value: directory, label: directory })),
        [directories],
    );

    const usesWorktrees = selectedProfile?.useWorktrees !== false;

    async function handleStart() {
        const trimmedName = name.trim();
        if (!trimmedName || !profileId || !selectedProfile || starting) return;
        if (!repositoryId) return;

        const trimmedWorkingDirectory = workingDirectory.trim() || DEFAULT_WORKING_DIRECTORY;

        if (usesWorktrees) {
            const trimmedBranch = branch.trim();
            if (!trimmedBranch) return;
            if (!isValidBranchName(trimmedBranch)) {
                showToast('invalid-branch-name');
                return;
            }

            setStarting(true);
            try {
                const session = await createSession({
                    profileId,
                    name: trimmedName,
                    repositoryId,
                    branch: trimmedBranch,
                    workingDirectory: trimmedWorkingDirectory,
                });
                onStarted(session);
            } catch (err: unknown) {
                showToast(
                    'generic-error',
                    err instanceof Error ? err.message : intl.formatMessage(messages.startFailed),
                );
                setStarting(false);
            }
            return;
        }

        setStarting(true);
        try {
            const session = await createSession({
                profileId,
                name: trimmedName,
                repositoryId,
                workingDirectory: trimmedWorkingDirectory,
            });
            onStarted(session);
        } catch (err: unknown) {
            showToast('generic-error', err instanceof Error ? err.message : intl.formatMessage(messages.startFailed));
            setStarting(false);
        }
    }

    const canStart =
        !loading &&
        !starting &&
        name.trim().length > 0 &&
        Boolean(profileId) &&
        Boolean(selectedProfile) &&
        Boolean(repositoryId) &&
        (!usesWorktrees || branch.trim().length > 0);

    return (
        <div
            className={styles.root}
            role='dialog'
            aria-modal='true'
            aria-label={intl.formatMessage(messages.ariaLabel)}
            onClick={(event) => {
                if (event.target === event.currentTarget && !starting) {
                    onClose();
                }
            }}
        >
            <div className={styles.shell} inert={starting || undefined}>
                <PageHeader
                    crumbs={[
                        {
                            label: intl.formatMessage(messages.sessionsCrumb),
                            onClick: starting ? undefined : onClose,
                        },
                        { label: intl.formatMessage(messages.crumb) },
                    ]}
                    showSettings={false}
                    onHomeClick={() => {
                        if (!starting) onClose();
                    }}
                    actions={
                        <IconButton label={intl.formatMessage(messages.close)} onClick={onClose} disabled={starting}>
                            ×
                        </IconButton>
                    }
                />
                <form
                    className={styles.form}
                    onSubmit={(event) => {
                        event.preventDefault();
                        void handleStart();
                    }}
                >
                    <div className={styles.body}>
                        <div className={styles.sectionHeader}>
                            <h2 className={styles.sectionTitle}>{intl.formatMessage(messages.title)}</h2>
                            <p className={styles.sectionDescription}>{intl.formatMessage(messages.description)}</p>
                        </div>

                        {loading ? <p className={styles.loading}>{intl.formatMessage(messages.loading)}</p> : null}

                        {!loading ? (
                            <div className={styles.fields}>
                                <label className={styles.label}>
                                    {intl.formatMessage(messages.nameLabel)}
                                    <input
                                        className={styles.input}
                                        type='text'
                                        value={name}
                                        onChange={(event) => setName(event.target.value)}
                                        placeholder={intl.formatMessage(messages.namePlaceholder)}
                                        autoComplete='off'
                                        autoCapitalize='off'
                                        autoCorrect='off'
                                        spellCheck={false}
                                        autoFocus
                                        disabled={starting}
                                    />
                                </label>

                                <div>
                                    <p className={styles.label}>{intl.formatMessage(messages.profileLabel)}</p>
                                    <SearchSelect
                                        options={profileOptions}
                                        value={profileId || null}
                                        onSelect={(option) => setProfileId(option.value)}
                                        placeholder={intl.formatMessage(messages.profilePlaceholder)}
                                        emptyMessage={intl.formatMessage(messages.profilesEmpty)}
                                        noResultsMessage={intl.formatMessage(messages.profileNoResults)}
                                        disabled={starting}
                                        ariaLabel={intl.formatMessage(messages.profileLabel)}
                                    />
                                </div>

                                <div>
                                    <p className={styles.label}>{intl.formatMessage(messages.projectLabel)}</p>
                                    <SearchSelect
                                        options={repositoryOptions}
                                        value={repositoryId || null}
                                        onSelect={(option) => {
                                            setRepositoryId(option.value);
                                            setBranch('');
                                            setWorkingDirectory(DEFAULT_WORKING_DIRECTORY);
                                        }}
                                        placeholder={intl.formatMessage(messages.projectPlaceholder)}
                                        emptyMessage={intl.formatMessage(messages.projectsEmpty)}
                                        noResultsMessage={intl.formatMessage(messages.projectNoResults)}
                                        disabled={starting}
                                        ariaLabel={intl.formatMessage(messages.projectLabel)}
                                    />
                                </div>

                                {usesWorktrees ? (
                                    <div>
                                        <p className={styles.label}>{intl.formatMessage(messages.branchLabel)}</p>
                                        <SearchSelect
                                            options={branchOptions}
                                            value={branch}
                                            allowCustom
                                            onChange={setBranch}
                                            onSelect={(option) => setBranch(option.value)}
                                            placeholder={intl.formatMessage(messages.branchPlaceholder)}
                                            disabled={starting || !repositoryId}
                                            ariaLabel={intl.formatMessage(messages.branchLabel)}
                                        />
                                    </div>
                                ) : null}

                                <div className={styles.advanced}>
                                    <button
                                        type='button'
                                        className={styles.advancedToggle}
                                        aria-expanded={advancedOpen}
                                        onClick={() => setAdvancedOpen((open) => !open)}
                                        disabled={starting}
                                    >
                                        <span>{intl.formatMessage(messages.advancedToggle)}</span>
                                        <AdvancedChevron open={advancedOpen} />
                                    </button>

                                    {advancedOpen ? (
                                        <div className={styles.advancedFields}>
                                            <div>
                                                <p className={styles.label}>
                                                    {intl.formatMessage(messages.workingDirectoryLabel)}
                                                </p>
                                                <SearchSelect
                                                    options={directoryOptions}
                                                    value={workingDirectory}
                                                    allowCustom
                                                    onChange={setWorkingDirectory}
                                                    onSelect={(option) => setWorkingDirectory(option.value)}
                                                    placeholder={intl.formatMessage(
                                                        messages.workingDirectoryPlaceholder,
                                                    )}
                                                    emptyMessage={intl.formatMessage(messages.workingDirectoryEmpty)}
                                                    noResultsMessage={intl.formatMessage(
                                                        messages.workingDirectoryNoResults,
                                                    )}
                                                    disabled={starting || !repositoryId}
                                                    ariaLabel={intl.formatMessage(messages.workingDirectoryLabel)}
                                                />
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        ) : null}
                    </div>
                    <div className={styles.footer}>
                        <Button type='submit' disabled={!canStart}>
                            {intl.formatMessage(starting ? messages.starting : messages.start)}
                        </Button>
                    </div>
                </form>
            </div>
            {starting ? (
                <div className={styles.startingOverlay}>
                    <Spinner
                        size='lg'
                        label={intl.formatMessage(messages.starting)}
                        className={styles.startingSpinner}
                    />
                    <p className={styles.startingLabel}>{intl.formatMessage(messages.starting)}</p>
                </div>
            ) : null}
        </div>
    );
}
