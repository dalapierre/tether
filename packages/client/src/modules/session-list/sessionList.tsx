import { Card } from '@client/components/card';
import { ConfirmDialog } from '@client/components/confirm-dialog';
import { IconButton } from '@client/components/icon-button';
import { PageHeader } from '@client/components/page-header';
import { SwipeToDelete } from '@client/components/swipe-to-delete';
import { listRepositories, type Repository } from '@client/libs/api/repositories';
import { deleteSession, listSessions, restartSession, type Session } from '@client/libs/api/sessions';
import { useKeybind } from '@client/libs/keybinds';
import { NewSession } from '@client/modules/new-session';
import { getSnapshot, removeSessionStatus, subscribe, upsertSessionStatus } from '@client/modules/session-events';
import { useSettings } from '@client/modules/settings';
import { showToast } from '@client/modules/toast';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';
import { messages } from './sessionList.messages';
import { styles } from './sessionList.styles';

function PlusIcon() {
    return (
        <svg
            className={styles.plusIcon}
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

export function SessionList() {
    const intl = useIntl();
    const navigate = useNavigate();
    const { openSettings } = useSettings();
    const [creating, setCreating] = useState(false);
    const [repositories, setRepositories] = useState<Repository[]>([]);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [sessionsLoading, setSessionsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [pendingDelete, setPendingDelete] = useState<Session | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [restartingId, setRestartingId] = useState<string | null>(null);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const selectedCardRef = useRef<HTMLDivElement | null>(null);
    const searchInputRef = useRef<HTMLInputElement | null>(null);
    const filteredSessionsRef = useRef<Session[]>([]);
    const selectedIndexRef = useRef(selectedIndex);
    selectedIndexRef.current = selectedIndex;

    const liveStatuses = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

    const sessionsWithLiveStatus = useMemo(
        () =>
            sessions.map((session) => {
                const live = liveStatuses.get(session.id);
                if (!live) return session;
                const status = live.status !== session.status ? live.status : session.status;
                const branch = live.branch !== undefined ? live.branch : session.branch;
                const behindDefault = live.behindDefault !== undefined ? live.behindDefault : session.behindDefault;
                const defaultBranch = live.defaultBranch !== undefined ? live.defaultBranch : session.defaultBranch;
                if (
                    status === session.status &&
                    branch === session.branch &&
                    behindDefault === session.behindDefault &&
                    defaultBranch === session.defaultBranch
                ) {
                    return session;
                }
                return { ...session, status, branch, behindDefault, defaultBranch };
            }),
        [sessions, liveStatuses],
    );

    const projectNames = useMemo(
        () => new Map(repositories.map((repository) => [repository.id, repository.name])),
        [repositories],
    );

    const filteredSessions = useMemo(() => {
        const normalized = searchQuery.trim().toLowerCase();
        if (!normalized) return sessionsWithLiveStatus;
        return sessionsWithLiveStatus.filter((session) => {
            const project = projectNames.get(session.repositoryId ?? '') ?? session.repositoryId ?? '';
            return (
                session.name.toLowerCase().includes(normalized) ||
                project.toLowerCase().includes(normalized) ||
                (session.branch?.toLowerCase().includes(normalized) ?? false)
            );
        });
    }, [sessionsWithLiveStatus, searchQuery, projectNames]);

    filteredSessionsRef.current = filteredSessions;

    const listInteractive = !creating && !sessionsLoading && filteredSessions.length > 0 && !pendingDelete;

    function blurSearch() {
        if (document.activeElement === searchInputRef.current) {
            searchInputRef.current?.blur();
        }
    }

    useKeybind('home', 'newSession', () => setCreating(true), { enabled: !creating && !pendingDelete });
    useKeybind('home', 'openSettings', () => openSettings(), { enabled: !creating && !pendingDelete });
    useKeybind(
        'home',
        'focusSearch',
        () => {
            searchInputRef.current?.focus();
            setSelectedIndex(null);
        },
        { enabled: !creating && !sessionsLoading && !pendingDelete },
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
        { enabled: listInteractive, allowInEditable: true },
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
        { enabled: listInteractive, allowInEditable: true },
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
        { enabled: listInteractive },
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
        { enabled: listInteractive && !restartingId },
    );

    useEffect(() => {
        if (!listInteractive) return;

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
    }, [listInteractive, navigate]);

    useEffect(() => {
        setSelectedIndex((current) => {
            if (filteredSessions.length === 0) return null;
            if (current === null) return null;
            return Math.min(current, filteredSessions.length - 1);
        });
    }, [filteredSessions]);

    useEffect(() => {
        selectedCardRef.current?.scrollIntoView({ block: 'nearest' });
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

    useEffect(() => {
        let cancelled = false;

        setSessionsLoading(true);
        listSessions()
            .then((items) => {
                if (!cancelled) {
                    setSessions(items);
                }
            })
            .catch((err: unknown) => {
                if (!cancelled) {
                    showToast(
                        'generic-error',
                        err instanceof Error ? err.message : intl.formatMessage(messages.sessionsLoadFailed),
                    );
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setSessionsLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [intl]);

    async function confirmDelete() {
        const session = pendingDelete;
        if (!session || deletingId) return;

        setDeletingId(session.id);
        setPendingDelete(null);
        setSessions((current) => current.filter((item) => item.id !== session.id));
        removeSessionStatus(session.id);

        try {
            await deleteSession(session.id);
        } catch (err: unknown) {
            setSessions((current) => [...current, session].sort((a, b) => b.createdAt - a.createdAt));
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
            setSessions((current) =>
                current.map((item) => (item.id === updated.id ? { ...item, status: updated.status } : item)),
            );
            upsertSessionStatus({
                sessionId: updated.id,
                name: updated.name,
                status: updated.status,
            });
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

    if (creating) {
        return (
            <NewSession
                onClose={() => setCreating(false)}
                onStarted={(session) => {
                    upsertSessionStatus({
                        sessionId: session.id,
                        name: session.name,
                        status: session.status,
                    });
                    setCreating(false);
                    navigate(`/sessions/${session.id}`);
                }}
            />
        );
    }

    const showEmpty = !sessionsLoading && sessions.length === 0;
    const showNoMatches = !sessionsLoading && sessions.length > 0 && filteredSessions.length === 0;
    const bodyClass = showEmpty || sessionsLoading || showNoMatches ? styles.bodyEmpty : styles.body;

    return (
        <div className={styles.root}>
            <PageHeader
                actions={
                    <IconButton label={intl.formatMessage(messages.newSession)} onClick={() => setCreating(true)}>
                        <PlusIcon />
                    </IconButton>
                }
            />
            <div className={styles.search}>
                <div className={styles.searchField}>
                    <input
                        ref={searchInputRef}
                        className={styles.searchInput}
                        type='search'
                        value={searchQuery}
                        placeholder={intl.formatMessage(messages.searchPlaceholder)}
                        aria-label={intl.formatMessage(messages.searchAriaLabel)}
                        disabled={sessionsLoading}
                        onChange={(event) => {
                            setSearchQuery(event.target.value);
                            setSelectedIndex(null);
                        }}
                        onKeyDown={(event) => {
                            if (event.key !== 'Escape') return;
                            event.preventDefault();
                            event.currentTarget.blur();
                        }}
                    />
                    {searchQuery ? (
                        <button
                            type='button'
                            className={styles.searchClear}
                            aria-label={intl.formatMessage(messages.clearSearch)}
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
            <div className={bodyClass}>
                {sessionsLoading ? (
                    <p className={styles.placeholder}>{intl.formatMessage(messages.loadingSessions)}</p>
                ) : null}
                {showEmpty ? <p className={styles.placeholder}>{intl.formatMessage(messages.noSessions)}</p> : null}
                {showNoMatches ? (
                    <p className={styles.placeholder}>{intl.formatMessage(messages.noMatchingSessions)}</p>
                ) : null}
                {!sessionsLoading
                    ? filteredSessions.map((session, index) => (
                          <div key={session.id} ref={index === selectedIndex ? selectedCardRef : null}>
                              <SwipeToDelete
                                  disabled={deletingId === session.id}
                                  onDelete={() => {
                                      setPendingDelete(session);
                                  }}
                              >
                                  <Card
                                      title={session.name}
                                      indicator={session.status}
                                      selected={index === selectedIndex}
                                      onClick={() => navigate(`/sessions/${session.id}`)}
                                      onRestart={
                                          session.status === 'error'
                                              ? () => {
                                                    void handleRestart(session);
                                                }
                                              : undefined
                                      }
                                      restartLabel={intl.formatMessage(messages.restartSession)}
                                      restartDisabled={restartingId === session.id}
                                  >
                                      {session.type === 'coding' ? (
                                          <>
                                              <span className={styles.project}>
                                                  {projectNames.get(session.repositoryId ?? '') ?? session.repositoryId}
                                              </span>
                                              <span className={styles.feature}>
                                                  {intl.formatMessage(messages.branchLabel, {
                                                      branch: session.branch ?? '',
                                                  })}
                                              </span>
                                          </>
                                      ) : (
                                          <span className={styles.feature}>
                                              {intl.formatMessage(messages.conversationSession)}
                                          </span>
                                      )}
                                  </Card>
                              </SwipeToDelete>
                          </div>
                      ))
                    : null}
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
        </div>
    );
}
