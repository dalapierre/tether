import logoLight from '@client/assets/logo_light.svg';
import { ConfirmDialog } from '@client/components/confirm-dialog';
import { IconButton } from '@client/components/icon-button';
import { Panel } from '@client/components/panel';
import { PanelResizeHandle, panelResizeHandleMessages } from '@client/components/panel-resize-handle';
import { SwipeToDelete } from '@client/components/swipe-to-delete';
import { listRepositories, type Repository } from '@client/libs/api/repositories';
import { deleteSession, restartSession, type Session, type SessionStatus } from '@client/libs/api/sessions';
import { useIsDesktop } from '@client/libs/dom/useMediaQuery';
import { useKeybind } from '@client/libs/keybinds';
import {
    clampSessionsPanelWidthPx,
    getSessionsPanelCollapsed,
    getSessionsPanelWidthPx,
    setSessionsPanelCollapsed,
    setSessionsPanelWidthPx,
    SESSIONS_PANEL_COLLAPSED_WIDTH_PX,
} from '@client/libs/layout/reviewLayoutPreferences';
import { panelLocationState } from '@client/libs/navigation/panelReturn';
import {
    getSessionsSnapshot,
    hasSessionsSnapshot,
    removeSession,
    subscribe,
    upsertSession,
    upsertSessionStatus,
} from '@client/modules/session-events';
import { useSettings } from '@client/modules/settings';
import { showToast } from '@client/modules/toast';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useIntl } from 'react-intl';
import { useLocation, useMatch, useNavigate } from 'react-router-dom';
import { messages } from './sessionsPanel.messages';
import { styles } from './sessionsPanel.styles';
import type { SessionsPanelProps } from './sessionsPanel.types';

function PlusIcon({ className = styles.plusIcon }: { className?: string }) {
    return (
        <svg
            className={className}
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            aria-hidden='true'
        >
            <path strokeLinecap='round' strokeLinejoin='round' d='M12 4.5v15m7.5-7.5h-15' />
        </svg>
    );
}

function ClearSearchIcon() {
    return (
        <svg
            className={styles.searchClearIcon}
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            aria-hidden='true'
        >
            <path strokeLinecap='round' strokeLinejoin='round' d='M6 18 18 6M6 6l12 12' />
        </svg>
    );
}

function SettingsIcon({ className = styles.settingsIcon }: { className?: string }) {
    return (
        <svg
            className={className}
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='1.75'
            aria-hidden='true'
        >
            <path
                strokeLinecap='round'
                strokeLinejoin='round'
                d='M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065'
            />
            <path strokeLinecap='round' strokeLinejoin='round' d='M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0' />
        </svg>
    );
}

function CollapseIcon() {
    return (
        <svg
            className={styles.collapseIcon}
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='1.75'
            aria-hidden='true'
        >
            <path
                strokeLinecap='round'
                strokeLinejoin='round'
                d='M9 4.5v15M4.5 4.5h15a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1v-13a1 1 0 0 1 1-1Z'
            />
            <path strokeLinecap='round' strokeLinejoin='round' d='M14.25 9 11.25 12l3 3' />
        </svg>
    );
}

function ListIcon() {
    return (
        <svg
            className={styles.listIcon}
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='1.75'
            aria-hidden='true'
        >
            <path strokeLinecap='round' strokeLinejoin='round' d='M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5' />
        </svg>
    );
}

function RestartIcon() {
    return (
        <svg
            className={styles.restartIcon}
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            aria-hidden='true'
        >
            <path
                strokeLinecap='round'
                strokeLinejoin='round'
                d='M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182'
            />
        </svg>
    );
}

function usageClassName(percent: number): string {
    if (percent > 60) return styles.usageDanger;
    if (percent >= 30) return styles.usageWarning;
    return styles.usage;
}

function indicatorClass(status: SessionStatus): string {
    switch (status) {
        case 'ready':
            return styles.indicatorReady;
        case 'busy':
            return styles.indicatorBusy;
        case 'error':
            return styles.indicatorError;
    }
}

function sessionButtonClass(active: boolean, selected: boolean): string {
    if (active) return styles.sessionButtonActive;
    if (selected) return styles.sessionButtonSelected;
    return styles.sessionButton;
}

export function SessionsPanel({ listInteractive = true }: SessionsPanelProps) {
    const intl = useIntl();
    const navigate = useNavigate();
    const location = useLocation();
    const isDesktop = useIsDesktop();
    const sessionMatch = useMatch('/sessions/:sessionId');
    const activeSessionId = sessionMatch?.params.sessionId;
    const { openSettings } = useSettings();
    const [repositories, setRepositories] = useState<Repository[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [pendingDelete, setPendingDelete] = useState<Session | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [restartingId, setRestartingId] = useState<string | null>(null);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [panelWidth, setPanelWidth] = useState(getSessionsPanelWidthPx);
    const [collapsed, setCollapsed] = useState(getSessionsPanelCollapsed);
    const selectedRowRef = useRef<HTMLDivElement | null>(null);
    const searchInputRef = useRef<HTMLInputElement | null>(null);
    const filteredSessionsRef = useRef<Session[]>([]);
    const selectedIndexRef = useRef(selectedIndex);
    const panelWidthRef = useRef(panelWidth);
    selectedIndexRef.current = selectedIndex;
    panelWidthRef.current = panelWidth;

    const effectivelyCollapsed = isDesktop && collapsed;

    const persistPanelWidth = useCallback(() => {
        setSessionsPanelWidthPx(panelWidthRef.current);
    }, []);

    const collapseSidebar = useCallback(() => {
        setCollapsed(true);
        setSessionsPanelCollapsed(true);
    }, []);

    const expandSidebar = useCallback(() => {
        setCollapsed(false);
        setSessionsPanelCollapsed(false);
    }, []);

    const liveSessions = useSyncExternalStore(subscribe, getSessionsSnapshot, getSessionsSnapshot);
    const sessionsLoading = !useSyncExternalStore(subscribe, hasSessionsSnapshot, hasSessionsSnapshot);

    const sessions = useMemo(
        () => [...liveSessions.values()].sort((a, b) => b.createdAt - a.createdAt),
        [liveSessions],
    );

    const projectNames = useMemo(
        () => new Map(repositories.map((repository) => [repository.id, repository.name])),
        [repositories],
    );

    const filteredSessions = useMemo(() => {
        const normalized = searchQuery.trim().toLowerCase();
        if (!normalized) return sessions;
        return sessions.filter((session) => {
            const project = projectNames.get(session.repositoryId ?? '') ?? session.repositoryId ?? '';
            return (
                session.name.toLowerCase().includes(normalized) ||
                project.toLowerCase().includes(normalized) ||
                (session.branch?.toLowerCase().includes(normalized) ?? false)
            );
        });
    }, [sessions, searchQuery, projectNames]);

    filteredSessionsRef.current = filteredSessions;

    const keybindsEnabled = listInteractive && !pendingDelete;
    const expandedKeybindsEnabled = keybindsEnabled && !effectivelyCollapsed;
    const navKeybindsEnabled = expandedKeybindsEnabled && !sessionsLoading && filteredSessions.length > 0;

    const openNewSession = useCallback(() => {
        if (location.pathname === '/new-session') return;
        navigate('/new-session', { state: panelLocationState(location.pathname, location.search) });
    }, [location.pathname, location.search, navigate]);

    function blurSearch() {
        if (document.activeElement === searchInputRef.current) {
            searchInputRef.current?.blur();
        }
    }

    useKeybind('home', 'newSession', openNewSession, { enabled: keybindsEnabled });
    useKeybind('home', 'openSettings', () => openSettings(), { enabled: keybindsEnabled });
    useKeybind(
        'home',
        'focusSearch',
        () => {
            searchInputRef.current?.focus();
            setSelectedIndex(null);
        },
        { enabled: expandedKeybindsEnabled && !sessionsLoading },
    );
    useKeybind(
        'home',
        'previousSession',
        () => {
            blurSearch();
            setSelectedIndex((current) => {
                const count = filteredSessionsRef.current.length;
                if (count === 0) return null;
                if (current === null) return count - 1;
                return Math.max(0, current - 1);
            });
        },
        { enabled: navKeybindsEnabled, allowInEditable: true },
    );
    useKeybind(
        'home',
        'nextSession',
        () => {
            blurSearch();
            setSelectedIndex((current) => {
                const count = filteredSessionsRef.current.length;
                if (count === 0) return null;
                if (current === null) return 0;
                return Math.min(count - 1, current + 1);
            });
        },
        { enabled: navKeybindsEnabled, allowInEditable: true },
    );
    useKeybind(
        'home',
        'deleteSession',
        () => {
            const index = selectedIndexRef.current;
            const session = index === null ? null : filteredSessionsRef.current[index];
            if (!session) return;
            setPendingDelete(session);
        },
        { enabled: navKeybindsEnabled },
    );
    useKeybind(
        'home',
        'restartSession',
        () => {
            const index = selectedIndexRef.current;
            const session = index === null ? null : filteredSessionsRef.current[index];
            if (!session || session.status !== 'error') return;
            void handleRestart(session);
        },
        { enabled: navKeybindsEnabled && !restartingId },
    );

    useEffect(() => {
        if (!navKeybindsEnabled) return;

        function onKeyDown(event: KeyboardEvent) {
            if (event.defaultPrevented || event.repeat) return;
            if (event.key !== 'Enter') return;
            if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
            if (document.querySelector('[aria-modal="true"]')) return;
            if (document.activeElement === searchInputRef.current) return;

            const index = selectedIndexRef.current;
            const session = index === null ? null : filteredSessionsRef.current[index];
            if (!session) return;

            event.preventDefault();
            navigate(`/sessions/${session.id}`);
        }

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [navKeybindsEnabled, navigate]);

    useEffect(() => {
        setSelectedIndex((current) => {
            if (filteredSessions.length === 0) return null;
            if (current === null) return null;
            return Math.min(current, filteredSessions.length - 1);
        });
    }, [filteredSessions]);

    useEffect(() => {
        selectedRowRef.current?.scrollIntoView({ block: 'nearest' });
    }, [selectedIndex]);

    useEffect(() => {
        let cancelled = false;

        listRepositories()
            .then((items) => {
                if (!cancelled) {
                    setRepositories(items);
                }
            })
            .catch(() => {
                // Project names are optional display; session list still works.
            });

        return () => {
            cancelled = true;
        };
    }, []);

    async function confirmDelete() {
        const session = pendingDelete;
        if (!session || deletingId) return;

        setDeletingId(session.id);
        setPendingDelete(null);
        removeSession(session.id);

        if (activeSessionId === session.id) {
            navigate('/', { replace: true });
        }

        try {
            await deleteSession(session.id);
        } catch (err: unknown) {
            upsertSession(session);
            showToast('generic-error', err instanceof Error ? err.message : intl.formatMessage(messages.deleteFailed));
        } finally {
            setDeletingId(null);
        }
    }

    async function handleRestart(session: Session) {
        if (restartingId || session.status !== 'error') return;

        setRestartingId(session.id);
        upsertSessionStatus({
            sessionId: session.id,
            name: session.name,
            status: 'busy',
        });

        try {
            const updated = await restartSession(session.id);
            upsertSession(updated);
        } catch (err: unknown) {
            upsertSessionStatus({
                sessionId: session.id,
                name: session.name,
                status: 'error',
            });
            showToast('generic-error', err instanceof Error ? err.message : intl.formatMessage(messages.restartFailed));
        } finally {
            setRestartingId(null);
        }
    }

    const showEmpty = !sessionsLoading && sessions.length === 0;
    const showNoMatches = !sessionsLoading && sessions.length > 0 && filteredSessions.length === 0;
    const bodyClass = showEmpty || sessionsLoading || showNoMatches ? styles.bodyEmpty : styles.body;
    const newSessionLabel = intl.formatMessage(messages.newSession);
    const settingsLabel = intl.formatMessage(messages.settings);
    const expandLabel = intl.formatMessage(messages.expandSidebar);
    const showSessionsLabel = intl.formatMessage(messages.showSessions);

    const wrapStyle = isDesktop
        ? { width: effectivelyCollapsed ? SESSIONS_PANEL_COLLAPSED_WIDTH_PX : panelWidth }
        : undefined;

    return (
        <>
            <div className={styles.wrap} style={wrapStyle}>
                <Panel className={styles.panel} aria-label={intl.formatMessage(messages.sessionsHeading)}>
                    <div className={styles.header}>
                        <div className={effectivelyCollapsed ? styles.logoOffset : styles.logoOffsetInset}>
                            {effectivelyCollapsed ? (
                                <button
                                    type='button'
                                    className={styles.logoButton}
                                    title={expandLabel}
                                    aria-label={expandLabel}
                                    onClick={expandSidebar}
                                >
                                    <img className={styles.logoImage} src={logoLight} alt='' />
                                </button>
                            ) : (
                                <div
                                    className={styles.iconSlot}
                                    aria-label={intl.formatMessage(messages.logo)}
                                    role='img'
                                >
                                    <img className={styles.logoImage} src={logoLight} alt='' />
                                </div>
                            )}
                        </div>
                        {isDesktop ? (
                            <div className={effectivelyCollapsed ? styles.headerActionsHidden : styles.headerActions}>
                                <IconButton
                                    label={intl.formatMessage(messages.collapseSidebar)}
                                    onClick={collapseSidebar}
                                >
                                    <CollapseIcon />
                                </IconButton>
                            </div>
                        ) : null}
                    </div>

                    <div className={styles.contentStack}>
                        <div
                            className={effectivelyCollapsed ? styles.expandedHidden : styles.expanded}
                            style={isDesktop ? { minWidth: panelWidth - 2 } : undefined}
                            aria-hidden={effectivelyCollapsed || undefined}
                        >
                            <div className={styles.mainStack}>
                                <button type='button' className={styles.inlineButton} onClick={openNewSession}>
                                    <span className={styles.inlineButtonIcon}>
                                        <PlusIcon className={styles.settingsIcon} />
                                    </span>
                                    <span className={styles.inlineButtonLabel}>{newSessionLabel}</span>
                                </button>

                                <div className={styles.sessionsSection}>
                                    <div className={styles.search}>
                                        <div className={styles.searchField}>
                                            <input
                                                ref={searchInputRef}
                                                className={styles.searchInput}
                                                type='search'
                                                value={searchQuery}
                                                placeholder={intl.formatMessage(messages.searchPlaceholder)}
                                                aria-label={intl.formatMessage(messages.searchAriaLabel)}
                                                disabled={sessionsLoading || effectivelyCollapsed}
                                                tabIndex={effectivelyCollapsed ? -1 : undefined}
                                                onChange={(event) => {
                                                    setSearchQuery(event.target.value);
                                                    setSelectedIndex(null);
                                                }}
                                                onKeyDown={(event) => {
                                                    if (event.key !== 'Escape') return;
                                                    event.preventDefault();
                                                    if (searchQuery) {
                                                        setSearchQuery('');
                                                        setSelectedIndex(null);
                                                        return;
                                                    }
                                                    event.currentTarget.blur();
                                                }}
                                            />
                                            {searchQuery ? (
                                                <button
                                                    type='button'
                                                    className={styles.searchClear}
                                                    aria-label={intl.formatMessage(messages.clearSearch)}
                                                    tabIndex={effectivelyCollapsed ? -1 : undefined}
                                                    onClick={() => {
                                                        setSearchQuery('');
                                                        setSelectedIndex(null);
                                                        searchInputRef.current?.focus();
                                                    }}
                                                >
                                                    <ClearSearchIcon />
                                                </button>
                                            ) : null}
                                        </div>
                                    </div>

                                    <p className={styles.sectionLabel}>
                                        {intl.formatMessage(messages.sessionsHeading)}
                                    </p>

                                    <div className={bodyClass}>
                                        {sessionsLoading ? (
                                            <p className={styles.placeholder}>
                                                {intl.formatMessage(messages.loadingSessions)}
                                            </p>
                                        ) : null}
                                        {showNoMatches ? (
                                            <p className={styles.placeholder}>
                                                {intl.formatMessage(messages.noMatchingSessions)}
                                            </p>
                                        ) : null}
                                        {!sessionsLoading
                                            ? filteredSessions.map((session, index) => {
                                                  const isActive = session.id === activeSessionId;
                                                  const isSelected = index === selectedIndex;
                                                  return (
                                                      <div key={session.id} ref={isSelected ? selectedRowRef : null}>
                                                          <SwipeToDelete
                                                              disabled={
                                                                  deletingId === session.id || effectivelyCollapsed
                                                              }
                                                              onDelete={() => {
                                                                  setPendingDelete(session);
                                                              }}
                                                          >
                                                              <div className={styles.sessionRow}>
                                                                  <button
                                                                      type='button'
                                                                      className={sessionButtonClass(
                                                                          isActive,
                                                                          isSelected,
                                                                      )}
                                                                      tabIndex={effectivelyCollapsed ? -1 : undefined}
                                                                      onClick={() =>
                                                                          navigate(`/sessions/${session.id}`)
                                                                      }
                                                                  >
                                                                      <span className={styles.sessionTitle}>
                                                                          {session.name}
                                                                      </span>
                                                                      {session.type === 'coding' ? (
                                                                          <p className={styles.sessionMeta}>
                                                                              <span className={styles.sessionMetaRepo}>
                                                                                  {projectNames.get(
                                                                                      session.repositoryId ?? '',
                                                                                  ) ?? session.repositoryId}
                                                                              </span>
                                                                              {' > '}
                                                                              {intl.formatMessage(
                                                                                  messages.branchLabel,
                                                                                  {
                                                                                      branch: session.branch ?? '',
                                                                                  },
                                                                              )}
                                                                          </p>
                                                                      ) : (
                                                                          <p className={styles.sessionMetaMuted}>
                                                                              {intl.formatMessage(
                                                                                  messages.conversationSession,
                                                                              )}
                                                                          </p>
                                                                      )}
                                                                      {session.cpuPercent != null ||
                                                                      session.ramPercent != null ? (
                                                                          <p className={styles.usageRow}>
                                                                              {session.cpuPercent != null ? (
                                                                                  <span
                                                                                      className={usageClassName(
                                                                                          session.cpuPercent,
                                                                                      )}
                                                                                  >
                                                                                      {intl.formatMessage(
                                                                                          messages.cpuLabel,
                                                                                          {
                                                                                              percent:
                                                                                                  session.cpuPercent,
                                                                                          },
                                                                                      )}
                                                                                  </span>
                                                                              ) : null}
                                                                              {session.ramPercent != null ? (
                                                                                  <span
                                                                                      className={usageClassName(
                                                                                          session.ramPercent,
                                                                                      )}
                                                                                  >
                                                                                      {intl.formatMessage(
                                                                                          messages.ramLabel,
                                                                                          {
                                                                                              percent:
                                                                                                  session.ramPercent,
                                                                                          },
                                                                                      )}
                                                                                  </span>
                                                                              ) : null}
                                                                          </p>
                                                                      ) : null}
                                                                  </button>
                                                                  <div className={styles.trailing}>
                                                                      {session.status === 'error' ? (
                                                                          <button
                                                                              type='button'
                                                                              className={styles.restartButton}
                                                                              aria-label={intl.formatMessage(
                                                                                  messages.restartSession,
                                                                              )}
                                                                              title={intl.formatMessage(
                                                                                  messages.restartSession,
                                                                              )}
                                                                              disabled={restartingId === session.id}
                                                                              tabIndex={
                                                                                  effectivelyCollapsed ? -1 : undefined
                                                                              }
                                                                              onClick={(event) => {
                                                                                  event.preventDefault();
                                                                                  event.stopPropagation();
                                                                                  void handleRestart(session);
                                                                              }}
                                                                          >
                                                                              <RestartIcon />
                                                                          </button>
                                                                      ) : null}
                                                                      <span
                                                                          className={`${styles.indicator} ${indicatorClass(session.status)}`}
                                                                          aria-hidden='true'
                                                                      />
                                                                  </div>
                                                              </div>
                                                          </SwipeToDelete>
                                                      </div>
                                                  );
                                              })
                                            : null}
                                    </div>
                                </div>
                            </div>

                            <div className={styles.settings}>
                                <button
                                    type='button'
                                    className={styles.settingsButton}
                                    tabIndex={effectivelyCollapsed ? -1 : undefined}
                                    onClick={openSettings}
                                >
                                    <span className={styles.inlineButtonIcon}>
                                        <SettingsIcon />
                                    </span>
                                    <span className={styles.inlineButtonLabel}>{settingsLabel}</span>
                                </button>
                            </div>
                        </div>

                        <div
                            className={effectivelyCollapsed ? styles.collapsedRail : styles.collapsedRailHidden}
                            aria-hidden={!effectivelyCollapsed || undefined}
                        >
                            <button
                                type='button'
                                className={styles.railIcon}
                                title={newSessionLabel}
                                aria-label={newSessionLabel}
                                tabIndex={effectivelyCollapsed ? undefined : -1}
                                onClick={openNewSession}
                            >
                                <PlusIcon />
                            </button>
                            <button
                                type='button'
                                className={styles.railIcon}
                                title={showSessionsLabel}
                                aria-label={showSessionsLabel}
                                tabIndex={effectivelyCollapsed ? undefined : -1}
                                onClick={expandSidebar}
                            >
                                <ListIcon />
                            </button>
                            <div className={styles.railSpacer} />
                            <div className={styles.settingsRail}>
                                <button
                                    type='button'
                                    className={styles.railIcon}
                                    title={settingsLabel}
                                    aria-label={settingsLabel}
                                    tabIndex={effectivelyCollapsed ? undefined : -1}
                                    onClick={openSettings}
                                >
                                    <SettingsIcon />
                                </button>
                            </div>
                        </div>
                    </div>

                    {pendingDelete ? (
                        <ConfirmDialog
                            message={intl.formatMessage(messages.deleteConfirm, { name: pendingDelete.name })}
                            cancelLabel={intl.formatMessage(messages.deleteConfirmCancel)}
                            confirmLabel={intl.formatMessage(messages.deleteConfirmContinue)}
                            busy={deletingId === pendingDelete.id}
                            onCancel={() => setPendingDelete(null)}
                            onConfirm={() => {
                                void confirmDelete();
                            }}
                        />
                    ) : null}
                </Panel>
                {isDesktop && !effectivelyCollapsed ? (
                    <PanelResizeHandle
                        edge='trailing'
                        className={styles.resize}
                        ariaLabel={intl.formatMessage(panelResizeHandleMessages.resizeSessionsPanel)}
                        onResize={(delta) => setPanelWidth((width) => clampSessionsPanelWidthPx(width + delta))}
                        onResizeEnd={persistPanelWidth}
                    />
                ) : null}
            </div>
        </>
    );
}
