import logoLight from '@ui/assets/logo_light.svg';
import { ConfirmDialog } from '@ui/components/confirm-dialog';
import { Panel } from '@ui/components/panel';
import { Spinner } from '@ui/components/spinner';
import { SwipeToDelete } from '@ui/components/swipe-to-delete';
import { Tooltip } from '@ui/components/tooltip';
import { listRepositories, type Repository } from '@ui/libs/api/repositories';
import { deleteSession, restartSession, type Session, type SessionStatus } from '@ui/libs/api/sessions';
import { useIsDesktop } from '@ui/libs/dom/useMediaQuery';
import { useKeybind } from '@ui/libs/keybinds';
import { panelLocationState } from '@ui/libs/navigation/panelReturn';
import {
    getSessionsSnapshot,
    hasSessionsSnapshot,
    removeSession,
    subscribe,
    upsertSession,
    upsertSessionStatus,
} from '@ui/modules/session-events';
import { useSettings } from '@ui/modules/settings';
import { showToast } from '@ui/modules/toast';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
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

function MoreIcon() {
    return (
        <svg className={styles.moreIcon} viewBox='0 0 24 24' fill='currentColor' aria-hidden='true'>
            <path d='M6.75 12a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0ZM12.75 12a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0ZM18.75 12a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z' />
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
        case 'initializing':
            return styles.indicatorBusy;
    }
}

function sessionButtonClass(active: boolean, selected: boolean): string {
    if (active) return styles.sessionButtonActive;
    if (selected) return styles.sessionButtonSelected;
    return styles.sessionButton;
}

export function SessionsPanel({
    listInteractive = true,
    sessionListOpen = true,
    onSessionListOpenChange,
}: SessionsPanelProps) {
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
    const [actionsMenu, setActionsMenu] = useState<{
        session: Session;
        top: number;
        right: number;
    } | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [restartingId, setRestartingId] = useState<string | null>(null);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const selectedRowRef = useRef<HTMLDivElement | null>(null);
    const searchInputRef = useRef<HTMLInputElement | null>(null);
    const actionsMenuRef = useRef<HTMLDivElement | null>(null);
    const filteredSessionsRef = useRef<Session[]>([]);
    const selectedIndexRef = useRef(selectedIndex);
    selectedIndexRef.current = selectedIndex;

    /** Mobile always shows the list; desktop keeps it mounted so the grid can animate open/closed. */
    const listVisible = !isDesktop || sessionListOpen;

    const toggleSessionList = useCallback(() => {
        onSessionListOpenChange?.(!sessionListOpen);
    }, [onSessionListOpenChange, sessionListOpen]);

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

    // Rail actions stay available while mounted. List navigation only when the list is
    // the primary surface — otherwise arrows/`r` fight session review keybinds.
    const panelFree = !pendingDelete && !actionsMenu;
    const railActionsEnabled = panelFree;
    const listActionsEnabled = railActionsEnabled && listVisible;
    const navKeybindsEnabled = listInteractive && listActionsEnabled && !sessionsLoading && filteredSessions.length > 0;

    const closeActionsMenu = useCallback(() => {
        setActionsMenu(null);
    }, []);

    const openActionsMenu = useCallback((session: Session, anchor: HTMLElement) => {
        const rect = anchor.getBoundingClientRect();
        setActionsMenu({
            session,
            top: rect.bottom + 4,
            right: window.innerWidth - rect.right,
        });
    }, []);

    const openNewSession = useCallback(() => {
        if (location.pathname === '/new-session') return;
        navigate('/new-session', { state: panelLocationState(location.pathname, location.search) });
    }, [location.pathname, location.search, navigate]);

    function blurSearch() {
        if (document.activeElement === searchInputRef.current) {
            searchInputRef.current?.blur();
        }
    }

    useKeybind('home', 'newSession', openNewSession, { enabled: railActionsEnabled });
    useKeybind('home', 'openSettings', () => openSettings(), { enabled: railActionsEnabled });
    useKeybind(
        'home',
        'focusSearch',
        () => {
            searchInputRef.current?.focus();
            setSelectedIndex(null);
        },
        { enabled: listActionsEnabled && !sessionsLoading },
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
        if (!actionsMenu) return;
        if (!liveSessions.has(actionsMenu.session.id)) {
            setActionsMenu(null);
        }
    }, [actionsMenu, liveSessions]);

    useEffect(() => {
        if (!actionsMenu) return;

        function onPointerDown(event: PointerEvent) {
            const target = event.target as Node | null;
            if (!target) return;
            if (actionsMenuRef.current?.contains(target)) return;
            if (target instanceof Element && target.closest('[data-session-actions-trigger]')) return;
            setActionsMenu(null);
        }

        function onKeyDown(event: KeyboardEvent) {
            if (event.key !== 'Escape' || event.defaultPrevented || event.repeat) return;
            event.preventDefault();
            setActionsMenu(null);
        }

        function onScroll() {
            setActionsMenu(null);
        }

        window.addEventListener('pointerdown', onPointerDown);
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('resize', onScroll);
        // Close when the session list scrolls underneath a fixed menu.
        document.addEventListener('scroll', onScroll, true);

        return () => {
            window.removeEventListener('pointerdown', onPointerDown);
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('resize', onScroll);
            document.removeEventListener('scroll', onScroll, true);
        };
    }, [actionsMenu]);

    useEffect(() => {
        if (!actionsMenu) return;
        const firstItem = actionsMenuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]');
        firstItem?.focus();
    }, [actionsMenu]);

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
    const sessionListLabel = intl.formatMessage(messages.sessionList);
    const sessionsHeading = intl.formatMessage(messages.sessionsHeading);

    const sessionList = (
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
                        disabled={sessionsLoading || !listVisible}
                        tabIndex={!listVisible ? -1 : undefined}
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
                        <Tooltip content={intl.formatMessage(messages.clearSearch)}>
                            <button
                                type='button'
                                className={styles.searchClear}
                                aria-label={intl.formatMessage(messages.clearSearch)}
                                tabIndex={!listVisible ? -1 : undefined}
                                onClick={() => {
                                    setSearchQuery('');
                                    setSelectedIndex(null);
                                    searchInputRef.current?.focus();
                                }}
                            >
                                <ClearSearchIcon />
                            </button>
                        </Tooltip>
                    ) : null}
                </div>
            </div>

            {!isDesktop ? <p className={styles.sectionLabel}>{sessionsHeading}</p> : null}

            <div className={bodyClass}>
                {sessionsLoading ? (
                    <p className={styles.placeholder}>{intl.formatMessage(messages.loadingSessions)}</p>
                ) : null}
                {showNoMatches ? (
                    <p className={styles.placeholder}>{intl.formatMessage(messages.noMatchingSessions)}</p>
                ) : null}
                {!sessionsLoading
                    ? filteredSessions.map((session, index) => {
                          const isActive = session.id === activeSessionId;
                          const isSelected = index === selectedIndex;
                          const isInitializing = session.status === 'initializing';
                          return (
                              <div key={session.id} ref={isSelected ? selectedRowRef : null}>
                                  <SwipeToDelete
                                      disabled={deletingId === session.id || !listVisible}
                                      onDelete={() => {
                                          setPendingDelete(session);
                                      }}
                                  >
                                      <div className={styles.sessionRow}>
                                          <button
                                              type='button'
                                              className={sessionButtonClass(isActive, isSelected)}
                                              tabIndex={!listVisible ? -1 : undefined}
                                              onClick={() => {
                                                  navigate(`/sessions/${session.id}`);
                                              }}
                                          >
                                              <span className={styles.sessionTitle}>{session.name}</span>
                                              {session.type === 'coding' ? (
                                                  <p className={styles.sessionMeta}>
                                                      <span className={styles.sessionMetaRepo}>
                                                          {projectNames.get(session.repositoryId ?? '') ??
                                                              session.repositoryId}
                                                      </span>
                                                      {' > '}
                                                      {intl.formatMessage(messages.branchLabel, {
                                                          branch: session.branch ?? '',
                                                      })}
                                                  </p>
                                              ) : (
                                                  <p className={styles.sessionMetaMuted}>
                                                      {intl.formatMessage(messages.conversationSession)}
                                                  </p>
                                              )}
                                              {session.cpuPercent != null || session.ramPercent != null ? (
                                                  <p className={styles.usageRow}>
                                                      {session.cpuPercent != null ? (
                                                          <span className={usageClassName(session.cpuPercent)}>
                                                              {intl.formatMessage(messages.cpuLabel, {
                                                                  percent: session.cpuPercent,
                                                              })}
                                                          </span>
                                                      ) : null}
                                                      {session.ramPercent != null ? (
                                                          <span className={usageClassName(session.ramPercent)}>
                                                              {intl.formatMessage(messages.ramLabel, {
                                                                  percent: session.ramPercent,
                                                              })}
                                                          </span>
                                                      ) : null}
                                                  </p>
                                              ) : null}
                                          </button>
                                          <div className={styles.trailing}>
                                              {session.status === 'error' ? (
                                                  <Tooltip content={intl.formatMessage(messages.restartSession)}>
                                                      <button
                                                          type='button'
                                                          className={styles.restartButton}
                                                          aria-label={intl.formatMessage(messages.restartSession)}
                                                          disabled={restartingId === session.id}
                                                          tabIndex={!listVisible ? -1 : undefined}
                                                          onClick={(event) => {
                                                              event.preventDefault();
                                                              event.stopPropagation();
                                                              void handleRestart(session);
                                                          }}
                                                      >
                                                          <RestartIcon />
                                                      </button>
                                                  </Tooltip>
                                              ) : null}
                                              {isInitializing ? (
                                                  <Spinner
                                                      size='sm'
                                                      label={intl.formatMessage(messages.initializing)}
                                                      className={styles.initializingSpinner}
                                                  />
                                              ) : (
                                                  <span
                                                      className={`${styles.indicator} ${indicatorClass(session.status)}`}
                                                      aria-hidden='true'
                                                  />
                                              )}
                                          </div>
                                          <div className={styles.moreActions}>
                                              <Tooltip content={intl.formatMessage(messages.sessionActions)}>
                                                  <button
                                                      type='button'
                                                      data-session-actions-trigger={session.id}
                                                      className={
                                                          actionsMenu?.session.id === session.id
                                                              ? styles.moreButtonOpen
                                                              : styles.moreButton
                                                      }
                                                      aria-label={intl.formatMessage(messages.sessionActions)}
                                                      aria-haspopup='menu'
                                                      aria-expanded={actionsMenu?.session.id === session.id}
                                                      disabled={deletingId === session.id}
                                                      tabIndex={!listVisible ? -1 : undefined}
                                                      onClick={(event) => {
                                                          event.preventDefault();
                                                          event.stopPropagation();
                                                          if (actionsMenu?.session.id === session.id) {
                                                              closeActionsMenu();
                                                              return;
                                                          }
                                                          openActionsMenu(session, event.currentTarget);
                                                      }}
                                                  >
                                                      <MoreIcon />
                                                  </button>
                                              </Tooltip>
                                          </div>
                                      </div>
                                  </SwipeToDelete>
                              </div>
                          );
                      })
                    : null}
            </div>
        </div>
    );

    const dialogs = (
        <>
            {actionsMenu ? (
                <div
                    ref={actionsMenuRef}
                    className={styles.actionsMenu}
                    style={{ top: actionsMenu.top, right: actionsMenu.right }}
                    role='menu'
                    aria-label={intl.formatMessage(messages.sessionActions)}
                >
                    <button
                        type='button'
                        role='menuitem'
                        className={styles.actionsMenuItemDanger}
                        onClick={() => {
                            const session = actionsMenu.session;
                            closeActionsMenu();
                            setPendingDelete(session);
                        }}
                    >
                        {intl.formatMessage(messages.deleteSession)}
                    </button>
                </div>
            ) : null}

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
        </>
    );

    return (
        <Fragment>
            {isDesktop ? (
                <div className={styles.railWrap}>
                    <Panel className={styles.panel} aria-label={intl.formatMessage(messages.logo)}>
                        <div className={styles.railHeader}>
                            <div className={styles.logoSlot} aria-label={intl.formatMessage(messages.logo)} role='img'>
                                <img className={styles.logoImage} src={logoLight} alt='' />
                            </div>
                        </div>
                        <div className={styles.railBody}>
                            <Tooltip content={newSessionLabel}>
                                <button
                                    type='button'
                                    className={styles.railIcon}
                                    aria-label={newSessionLabel}
                                    onClick={openNewSession}
                                >
                                    <PlusIcon />
                                </button>
                            </Tooltip>
                            <Tooltip content={sessionListLabel}>
                                <button
                                    type='button'
                                    className={sessionListOpen ? styles.railIconActive : styles.railIcon}
                                    aria-label={sessionListLabel}
                                    aria-pressed={sessionListOpen}
                                    onClick={toggleSessionList}
                                >
                                    <ListIcon />
                                </button>
                            </Tooltip>
                            <div className={styles.railSpacer} />
                            <div className={styles.settingsRail}>
                                <Tooltip content={settingsLabel}>
                                    <button
                                        type='button'
                                        className={styles.railIcon}
                                        aria-label={settingsLabel}
                                        onClick={openSettings}
                                    >
                                        <SettingsIcon />
                                    </button>
                                </Tooltip>
                            </div>
                        </div>
                        {dialogs}
                    </Panel>
                </div>
            ) : null}

            {isDesktop ? <div className={styles.railGap} aria-hidden='true' /> : null}

            <div
                className={listVisible ? styles.listWrap : styles.listWrapHidden}
                aria-hidden={!listVisible || undefined}
                inert={!listVisible ? true : undefined}
            >
                <Panel className={styles.panel} aria-label={sessionsHeading}>
                    {!isDesktop ? (
                        <div className={styles.listHeaderMobile}>
                            <div className={styles.logoSlot} aria-label={intl.formatMessage(messages.logo)} role='img'>
                                <img className={styles.logoImage} src={logoLight} alt='' />
                            </div>
                        </div>
                    ) : null}

                    <div className={styles.mainStack}>
                        {!isDesktop ? (
                            <button type='button' className={styles.inlineButton} onClick={openNewSession}>
                                <span className={styles.inlineButtonIcon}>
                                    <PlusIcon className={styles.settingsIcon} />
                                </span>
                                <span className={styles.inlineButtonLabel}>{newSessionLabel}</span>
                            </button>
                        ) : null}

                        {sessionList}

                        {!isDesktop ? (
                            <div className={styles.settings}>
                                <button type='button' className={styles.settingsButton} onClick={openSettings}>
                                    <span className={styles.inlineButtonIcon}>
                                        <SettingsIcon />
                                    </span>
                                    <span className={styles.inlineButtonLabel}>{settingsLabel}</span>
                                </button>
                            </div>
                        ) : null}
                    </div>

                    {!isDesktop ? dialogs : null}
                </Panel>
            </div>
        </Fragment>
    );
}
