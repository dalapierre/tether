import { Button } from '@ui/components/button';
import { RoutePanel } from '@ui/components/route-panel';
import { SearchSelect } from '@ui/components/search-select';
import { Spinner } from '@ui/components/spinner';
import { Toggle } from '@ui/components/toggle';
import { agentLabelMessage, isAgentId, type AgentId } from '@ui/libs/agents/agents';
import { listAvailableAgents, type AvailableAgent } from '@ui/libs/api/agents';
import { ApiError } from '@ui/libs/api/client';
import { listRepositories, prefetchRepositoryDirectories, type Repository } from '@ui/libs/api/repositories';
import { createSession } from '@ui/libs/api/sessions';
import { getSettings } from '@ui/libs/api/settings';
import { isValidBranchName } from '@ui/libs/git/branchName';
import { showToast } from '@ui/modules/toast';
import { useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { messages } from './newSession.messages';
import { styles } from './newSession.styles';
import type { NewSessionProps } from './newSession.types';

const DEFAULT_WORKING_DIRECTORY = '/';

function resolveHarnessIds(availableAgents: AvailableAgent[], selectedAgent: AgentId): AgentId[] {
    const ids = availableAgents.map((agent) => agent.id);
    if (!ids.includes(selectedAgent) && isAgentId(selectedAgent)) {
        return [selectedAgent, ...ids];
    }
    return ids;
}

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
    const [agent, setAgent] = useState<AgentId>('cursor');
    const [yoloMode, setYoloMode] = useState(false);
    const [useWorktrees, setUseWorktrees] = useState(true);
    const [repositoryId, setRepositoryId] = useState('');
    const [branch, setBranch] = useState('');
    const [workingDirectory, setWorkingDirectory] = useState(DEFAULT_WORKING_DIRECTORY);
    const [directories, setDirectories] = useState<string[]>([DEFAULT_WORKING_DIRECTORY]);
    const [directoriesLoading, setDirectoriesLoading] = useState(false);
    const [worktreesDir, setWorktreesDir] = useState('');
    const [defaultWorktreesDir, setDefaultWorktreesDir] = useState('');
    const [advancedOpen, setAdvancedOpen] = useState(false);
    const [repositories, setRepositories] = useState<Repository[]>([]);
    const [availableAgents, setAvailableAgents] = useState<AvailableAgent[]>([]);
    const [loading, setLoading] = useState(true);
    const [starting, setStarting] = useState(false);

    useEffect(() => {
        let cancelled = false;

        Promise.all([getSettings(), listRepositories(), listAvailableAgents()])
            .then(([settings, items, agents]) => {
                if (cancelled) return;
                setAgent(settings.defaultAgent);
                setYoloMode(settings.defaultYoloMode);
                setUseWorktrees(settings.defaultUseWorktrees);
                setDefaultWorktreesDir(settings.worktreesDir);
                setRepositories(items);
                setAvailableAgents(agents);
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
            setDirectories([DEFAULT_WORKING_DIRECTORY]);
            setWorkingDirectory(DEFAULT_WORKING_DIRECTORY);
            setDirectoriesLoading(false);
            return;
        }

        let cancelled = false;
        setDirectories([DEFAULT_WORKING_DIRECTORY]);
        setWorkingDirectory(DEFAULT_WORKING_DIRECTORY);
        setDirectoriesLoading(true);

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
            })
            .finally(() => {
                if (!cancelled) {
                    setDirectoriesLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [repositoryId]);

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

    const repositoryOptions = useMemo(
        () => repositories.map((repository) => ({ value: repository.id, label: repository.name })),
        [repositories],
    );

    const directoryOptions = useMemo(
        () => directories.map((directory) => ({ value: directory, label: directory })),
        [directories],
    );

    const harnessOptions = useMemo(() => resolveHarnessIds(availableAgents, agent), [availableAgents, agent]);

    async function handleStart() {
        const trimmedName = name.trim();
        if (!trimmedName || starting) return;
        if (!repositoryId) return;

        const trimmedWorkingDirectory = workingDirectory.trim() || DEFAULT_WORKING_DIRECTORY;
        const trimmedWorktreesDir = worktreesDir.trim();

        if (useWorktrees) {
            const trimmedBranch = branch.trim();
            if (!trimmedBranch) return;
            if (!isValidBranchName(trimmedBranch)) {
                showToast('invalid-branch-name');
                return;
            }

            setStarting(true);
            try {
                const session = await createSession({
                    name: trimmedName,
                    agent,
                    yoloMode,
                    useWorktrees: true,
                    repositoryId,
                    branch: trimmedBranch,
                    workingDirectory: trimmedWorkingDirectory,
                    worktreesDir: trimmedWorktreesDir || undefined,
                });
                onStarted(session);
            } catch (err: unknown) {
                if (err instanceof ApiError && err.message === 'Branch is already checked out in another worktree') {
                    showToast('branch-in-use');
                } else {
                    showToast(
                        'generic-error',
                        err instanceof Error ? err.message : intl.formatMessage(messages.startFailed),
                    );
                }
                setStarting(false);
            }
            return;
        }

        setStarting(true);
        try {
            const session = await createSession({
                name: trimmedName,
                agent,
                yoloMode,
                useWorktrees: false,
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
        Boolean(repositoryId) &&
        (!useWorktrees || branch.trim().length > 0);

    return (
        <form
            className={styles.form}
            onSubmit={(event) => {
                event.preventDefault();
                void handleStart();
            }}
        >
            <RoutePanel
                title={intl.formatMessage(messages.title)}
                onClose={onClose}
                closeLabel={intl.formatMessage(messages.close)}
                closeDisabled={starting}
                aria-label={intl.formatMessage(messages.ariaLabel)}
                footer={
                    <div className={styles.footer}>
                        <Button type='submit' disabled={!canStart}>
                            {intl.formatMessage(starting ? messages.starting : messages.start)}
                        </Button>
                    </div>
                }
                overlay={
                    starting ? (
                        <div className={styles.startingOverlay}>
                            <Spinner
                                size='lg'
                                label={intl.formatMessage(messages.starting)}
                                className={styles.startingSpinner}
                            />
                            <p className={styles.startingLabel}>{intl.formatMessage(messages.starting)}</p>
                        </div>
                    ) : null
                }
            >
                <div>
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

                        {useWorktrees ? (
                            <label className={styles.label}>
                                {intl.formatMessage(messages.branchLabel)}
                                <input
                                    className={styles.input}
                                    type='text'
                                    value={branch}
                                    onChange={(event) => setBranch(event.target.value)}
                                    placeholder={intl.formatMessage(messages.branchPlaceholder)}
                                    autoComplete='off'
                                    autoCapitalize='off'
                                    autoCorrect='off'
                                    spellCheck={false}
                                    disabled={starting || !repositoryId}
                                />
                            </label>
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
                                    <label className={styles.label}>
                                        {intl.formatMessage(messages.harnessLabel)}
                                        <select
                                            className={styles.select}
                                            value={agent}
                                            onChange={(event) => {
                                                const next = event.target.value;
                                                if (harnessOptions.includes(next as AgentId)) {
                                                    setAgent(next as AgentId);
                                                }
                                            }}
                                            disabled={starting || harnessOptions.length === 0}
                                        >
                                            {harnessOptions.length === 0 ? (
                                                <option value={agent}>
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
                                        label={intl.formatMessage(messages.yoloModeLabel)}
                                        description={intl.formatMessage(messages.yoloModeHint)}
                                        checked={yoloMode}
                                        disabled={starting}
                                        onChange={setYoloMode}
                                    />

                                    <Toggle
                                        label={intl.formatMessage(messages.useWorktreesLabel)}
                                        description={intl.formatMessage(messages.useWorktreesHint)}
                                        checked={useWorktrees}
                                        disabled={starting}
                                        onChange={setUseWorktrees}
                                    />

                                    {useWorktrees ? (
                                        <label className={styles.label}>
                                            {intl.formatMessage(messages.worktreesDirLabel)}
                                            <input
                                                className={styles.input}
                                                type='text'
                                                value={worktreesDir}
                                                onChange={(event) => setWorktreesDir(event.target.value)}
                                                placeholder={defaultWorktreesDir}
                                                autoComplete='off'
                                                autoCapitalize='off'
                                                autoCorrect='off'
                                                spellCheck={false}
                                                disabled={starting}
                                            />
                                            <span className={styles.fieldHint}>
                                                {intl.formatMessage(messages.worktreesDirHint)}
                                            </span>
                                        </label>
                                    ) : null}

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
                                            placeholder={intl.formatMessage(messages.workingDirectoryPlaceholder)}
                                            emptyMessage={intl.formatMessage(messages.workingDirectoryEmpty)}
                                            noResultsMessage={intl.formatMessage(messages.workingDirectoryNoResults)}
                                            limitMessage={intl.formatMessage(messages.workingDirectoryLimit)}
                                            disabled={starting || !repositoryId}
                                            loading={directoriesLoading}
                                            loadingLabel={intl.formatMessage(messages.loading)}
                                            ariaLabel={intl.formatMessage(messages.workingDirectoryLabel)}
                                        />
                                        <span className={styles.fieldHint}>
                                            {intl.formatMessage(messages.workingDirectoryHint)}
                                        </span>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </div>
                ) : null}
            </RoutePanel>
        </form>
    );
}
