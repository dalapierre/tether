import { Button } from '@ui/components/button';
import { ConfirmDialog } from '@ui/components/confirm-dialog';
import { RoutePanel } from '@ui/components/route-panel';
import { Toggle } from '@ui/components/toggle';
import { Tooltip } from '@ui/components/tooltip';
import { agentLabelMessage, isAgentId, type AgentId } from '@ui/libs/agents/agents';
import { listAvailableAgents, type AvailableAgent } from '@ui/libs/api/agents';
import { ApiError } from '@ui/libs/api/client';
import { getSettings, updateSettings } from '@ui/libs/api/settings';
import { DEFAULT_KEYBINDS, cloneKeybinds, keybindsEqual, type Keybinds } from '@ui/libs/keybinds';
import { useEditorTabDirty } from '@ui/modules/editor-tabs';
import { DEFAULT_TOAST_DURATION_SECONDS, setToastDurationSeconds, showToast } from '@ui/modules/toast';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { KeybindsPanel } from './keybindsPanel';
import { messages } from './settings.messages';
import { styles } from './settings.styles';
import type { SettingsProps } from './settings.types';

const MIN_TOAST_DURATION_SECONDS = 1;
const MAX_TOAST_DURATION_SECONDS = 120;

type SettingsView = 'root' | 'general' | 'agents' | 'keybinds';

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

function BackIcon() {
    return (
        <svg
            className={styles.backIcon}
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            aria-hidden='true'
        >
            <path strokeLinecap='round' strokeLinejoin='round' d='M15.75 19.5 8.25 12l7.5-7.5' />
        </svg>
    );
}

function resolveHarnessIds(availableAgents: AvailableAgent[], selectedAgent: AgentId): AgentId[] {
    const ids = availableAgents.map((agent) => agent.id);
    if (!ids.includes(selectedAgent) && isAgentId(selectedAgent)) {
        return [selectedAgent, ...ids];
    }
    return ids;
}

export function Settings({ onClose, onKeybindsSaved }: SettingsProps) {
    const intl = useIntl();
    const [view, setView] = useState<SettingsView>('root');
    const [devDir, setDevDir] = useState('');
    const [worktreesDir, setWorktreesDir] = useState('');
    const [toastDurationSeconds, setToastDurationSecondsState] = useState(DEFAULT_TOAST_DURATION_SECONDS);
    const [defaultAgent, setDefaultAgent] = useState<AgentId>('cursor');
    const [defaultYoloMode, setDefaultYoloMode] = useState(false);
    const [defaultUseWorktrees, setDefaultUseWorktrees] = useState(true);
    const [keybinds, setKeybinds] = useState<Keybinds>(() => cloneKeybinds(DEFAULT_KEYBINDS));
    const [savedDevDir, setSavedDevDir] = useState('');
    const [savedWorktreesDir, setSavedWorktreesDir] = useState('');
    const [savedToastDurationSeconds, setSavedToastDurationSeconds] = useState(DEFAULT_TOAST_DURATION_SECONDS);
    const [savedDefaultAgent, setSavedDefaultAgent] = useState<AgentId>('cursor');
    const [savedDefaultYoloMode, setSavedDefaultYoloMode] = useState(false);
    const [savedDefaultUseWorktrees, setSavedDefaultUseWorktrees] = useState(true);
    const [savedKeybinds, setSavedKeybinds] = useState<Keybinds>(() => cloneKeybinds(DEFAULT_KEYBINDS));
    const [availableAgents, setAvailableAgents] = useState<AvailableAgent[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [pendingDiscard, setPendingDiscard] = useState(false);

    useEffect(() => {
        let cancelled = false;

        Promise.all([getSettings(), listAvailableAgents()])
            .then(([settings, agents]) => {
                if (cancelled) return;
                setDevDir(settings.devDir);
                setWorktreesDir(settings.worktreesDir);
                setToastDurationSecondsState(settings.toastDurationSeconds);
                setDefaultAgent(settings.defaultAgent);
                setDefaultYoloMode(settings.defaultYoloMode);
                setDefaultUseWorktrees(settings.defaultUseWorktrees);
                setKeybinds(cloneKeybinds(settings.keybinds));
                setSavedDevDir(settings.devDir);
                setSavedWorktreesDir(settings.worktreesDir);
                setSavedToastDurationSeconds(settings.toastDurationSeconds);
                setSavedDefaultAgent(settings.defaultAgent);
                setSavedDefaultYoloMode(settings.defaultYoloMode);
                setSavedDefaultUseWorktrees(settings.defaultUseWorktrees);
                setSavedKeybinds(cloneKeybinds(settings.keybinds));
                setToastDurationSeconds(settings.toastDurationSeconds);
                setAvailableAgents(agents);
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
        if (view !== 'root') {
            setView('root');
            return;
        }
        onClose();
    }, [onClose, view]);

    const generalDirty =
        devDir.trim() !== savedDevDir ||
        worktreesDir.trim() !== savedWorktreesDir ||
        toastDurationSeconds !== savedToastDurationSeconds;
    const agentsDirty =
        defaultAgent !== savedDefaultAgent ||
        defaultYoloMode !== savedDefaultYoloMode ||
        defaultUseWorktrees !== savedDefaultUseWorktrees;
    const keybindsDirty = !keybindsEqual(keybinds, savedKeybinds);
    const hasUnsavedChanges = generalDirty || agentsDirty || keybindsDirty;

    const discardAllChanges = useCallback(() => {
        setDevDir(savedDevDir);
        setWorktreesDir(savedWorktreesDir);
        setToastDurationSecondsState(savedToastDurationSeconds);
        setDefaultAgent(savedDefaultAgent);
        setDefaultYoloMode(savedDefaultYoloMode);
        setDefaultUseWorktrees(savedDefaultUseWorktrees);
        setKeybinds(cloneKeybinds(savedKeybinds));
    }, [
        savedDefaultAgent,
        savedDefaultUseWorktrees,
        savedDefaultYoloMode,
        savedDevDir,
        savedKeybinds,
        savedToastDurationSeconds,
        savedWorktreesDir,
    ]);

    function discardChanges() {
        if (view === 'general') {
            setDevDir(savedDevDir);
            setWorktreesDir(savedWorktreesDir);
            setToastDurationSecondsState(savedToastDurationSeconds);
        } else if (view === 'agents') {
            setDefaultAgent(savedDefaultAgent);
            setDefaultYoloMode(savedDefaultYoloMode);
            setDefaultUseWorktrees(savedDefaultUseWorktrees);
        } else if (view === 'keybinds') {
            setKeybinds(cloneKeybinds(savedKeybinds));
        }
        setPendingDiscard(false);
    }

    const handleSave = useCallback(async (): Promise<boolean> => {
        setSaving(true);

        try {
            const settings = await updateSettings({
                devDir: devDir.trim(),
                worktreesDir: worktreesDir.trim(),
                toastDurationSeconds,
                defaultAgent,
                defaultYoloMode,
                defaultUseWorktrees,
                keybinds,
            });
            setDevDir(settings.devDir);
            setWorktreesDir(settings.worktreesDir);
            setToastDurationSecondsState(settings.toastDurationSeconds);
            setDefaultAgent(settings.defaultAgent);
            setDefaultYoloMode(settings.defaultYoloMode);
            setDefaultUseWorktrees(settings.defaultUseWorktrees);
            setKeybinds(cloneKeybinds(settings.keybinds));
            setSavedDevDir(settings.devDir);
            setSavedWorktreesDir(settings.worktreesDir);
            setSavedToastDurationSeconds(settings.toastDurationSeconds);
            setSavedDefaultAgent(settings.defaultAgent);
            setSavedDefaultYoloMode(settings.defaultYoloMode);
            setSavedDefaultUseWorktrees(settings.defaultUseWorktrees);
            setSavedKeybinds(cloneKeybinds(settings.keybinds));
            setToastDurationSeconds(settings.toastDurationSeconds);
            onKeybindsSaved?.(settings.keybinds);
            showToast('settings-saved');

            try {
                const agents = await listAvailableAgents();
                setAvailableAgents(agents);
            } catch {
                // Keep the current list if refresh fails.
            }
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
        } finally {
            setSaving(false);
        }
    }, [
        defaultAgent,
        defaultUseWorktrees,
        defaultYoloMode,
        devDir,
        intl,
        keybinds,
        onKeybindsSaved,
        toastDurationSeconds,
        worktreesDir,
    ]);

    useEditorTabDirty('settings', hasUnsavedChanges, handleSave, discardAllChanges);

    const showSaveButton =
        !loading &&
        ((view === 'general' && generalDirty) ||
            (view === 'agents' && agentsDirty) ||
            (view === 'keybinds' && keybindsDirty));
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
        }
    }, [intl, view]);

    const footer = showSaveButton ? (
        <div className={styles.footer}>
            <div className={styles.footerActions}>
                <Button type='button' variant='secondary' onClick={() => setPendingDiscard(true)} disabled={saving}>
                    {intl.formatMessage(messages.cancel)}
                </Button>
                <Button type='button' onClick={() => void handleSave()} disabled={saving}>
                    {saving ? intl.formatMessage(messages.saving) : intl.formatMessage(messages.save)}
                </Button>
            </div>
        </div>
    ) : null;

    return (
        <>
            <RoutePanel
                onClose={() => onClose()}
                closeLabel={intl.formatMessage(messages.close)}
                hideToolbar
                aria-label={intl.formatMessage(messages.ariaLabel)}
                footer={footer}
            >
                {!loading || view === 'root' ? (
                    <div className={styles.sectionHeader}>
                        <div className={styles.sectionTitleRow}>
                            {view !== 'root' ? (
                                <Tooltip content={intl.formatMessage(messages.back)}>
                                    <button
                                        type='button'
                                        className={styles.sectionBack}
                                        aria-label={intl.formatMessage(messages.back)}
                                        onClick={goBack}
                                    >
                                        <BackIcon />
                                    </button>
                                </Tooltip>
                            ) : null}
                            <h2 className={styles.sectionTitle}>{sectionHeader.title}</h2>
                        </div>
                        <p className={styles.sectionDescription}>{sectionHeader.description}</p>
                    </div>
                ) : null}

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
                            <button type='button' className={styles.categoryButton} onClick={() => setView('keybinds')}>
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

                        <label className={styles.label}>
                            {intl.formatMessage(messages.worktreesDirLabel)}
                            <input
                                className={styles.input}
                                type='text'
                                value={worktreesDir}
                                onChange={(event) => setWorktreesDir(event.target.value)}
                                placeholder={intl.formatMessage(messages.worktreesDirPlaceholder)}
                                autoComplete='off'
                                autoCapitalize='off'
                                autoCorrect='off'
                                spellCheck={false}
                            />
                        </label>
                        <p className={styles.hint}>{intl.formatMessage(messages.worktreesDirHint)}</p>

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
                                    <option value={defaultAgent}>{intl.formatMessage(messages.harnessesEmpty)}</option>
                                ) : (
                                    defaultHarnessOptions.map((agentId) => (
                                        <option key={agentId} value={agentId}>
                                            {intl.formatMessage(agentLabelMessage(agentId))}
                                        </option>
                                    ))
                                )}
                            </select>
                        </label>

                        <Toggle
                            label={intl.formatMessage(messages.defaultYoloModeLabel)}
                            description={intl.formatMessage(messages.defaultYoloModeHint)}
                            checked={defaultYoloMode}
                            onChange={setDefaultYoloMode}
                        />

                        <Toggle
                            label={intl.formatMessage(messages.defaultUseWorktreesLabel)}
                            description={intl.formatMessage(messages.defaultUseWorktreesHint)}
                            checked={defaultUseWorktrees}
                            onChange={setDefaultUseWorktrees}
                        />
                    </div>
                ) : null}

                {view === 'keybinds' && !loading ? (
                    <KeybindsPanel keybinds={keybinds} onChange={setKeybinds} disabled={saving} />
                ) : null}
            </RoutePanel>
            {pendingDiscard ? (
                <ConfirmDialog
                    message={intl.formatMessage(messages.discardChangesConfirm)}
                    cancelLabel={intl.formatMessage(messages.cancel)}
                    confirmLabel={intl.formatMessage(messages.discardChangesConfirmContinue)}
                    onCancel={() => setPendingDiscard(false)}
                    onConfirm={discardChanges}
                />
            ) : null}
        </>
    );
}
