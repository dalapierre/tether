import { Button } from '@client/components/button';
import { Card } from '@client/components/card';
import { ConfirmDialog } from '@client/components/confirm-dialog';
import { PageHeader } from '@client/components/page-header';
import { SwipeToDelete } from '@client/components/swipe-to-delete';
import { listRepositories, type Repository } from '@client/libs/api/repositories';
import { deleteSession, listSessions, type Session } from '@client/libs/api/sessions';
import { useKeybind } from '@client/libs/keybinds';
import { NewSession } from '@client/modules/new-session';
import { useSettings } from '@client/modules/settings';
import { showToast } from '@client/modules/toast';
import { useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';
import { messages } from './sessionList.messages';
import { styles } from './sessionList.styles';

export function SessionList() {
    const intl = useIntl();
    const navigate = useNavigate();
    const { openSettings } = useSettings();
    const [creating, setCreating] = useState(false);
    const [repositories, setRepositories] = useState<Repository[]>([]);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [sessionsLoading, setSessionsLoading] = useState(true);
    const [pendingDelete, setPendingDelete] = useState<Session | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const selectedCardRef = useRef<HTMLDivElement | null>(null);
    const sessionsRef = useRef(sessions);
    const selectedIndexRef = useRef(selectedIndex);
    sessionsRef.current = sessions;
    selectedIndexRef.current = selectedIndex;

    const listInteractive = !creating && !sessionsLoading && sessions.length > 0 && !pendingDelete;

    useKeybind('home', 'newSession', () => setCreating(true), { enabled: !creating && !pendingDelete });
    useKeybind('home', 'openSettings', () => openSettings(), { enabled: !creating && !pendingDelete });
    useKeybind(
        'home',
        'previousSession',
        () => {
            setSelectedIndex((current) => {
                const count = sessionsRef.current.length;
                if (count === 0) return null;
                if (current === null) return count - 1;
                return Math.max(0, current - 1);
            });
        },
        { enabled: listInteractive },
    );
    useKeybind(
        'home',
        'nextSession',
        () => {
            setSelectedIndex((current) => {
                const count = sessionsRef.current.length;
                if (count === 0) return null;
                if (current === null) return 0;
                return Math.min(count - 1, current + 1);
            });
        },
        { enabled: listInteractive },
    );

    useEffect(() => {
        if (!listInteractive) return;

        function onKeyDown(event: KeyboardEvent) {
            if (event.defaultPrevented || event.repeat) return;
            if (event.key !== 'Enter') return;
            if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
            if (document.querySelector('[aria-modal="true"]')) return;

            const index = selectedIndexRef.current;
            const session = index === null ? null : sessionsRef.current[index];
            if (!session) return;

            event.preventDefault();
            navigate(`/sessions/${session.id}`);
        }

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [listInteractive, navigate]);

    useEffect(() => {
        setSelectedIndex((current) => {
            if (sessions.length === 0) return null;
            if (current === null) return null;
            return Math.min(current, sessions.length - 1);
        });
    }, [sessions]);

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

        try {
            await deleteSession(session.id);
        } catch (err: unknown) {
            setSessions((current) => [...current, session].sort((a, b) => b.createdAt - a.createdAt));
            showToast('generic-error', err instanceof Error ? err.message : intl.formatMessage(messages.deleteFailed));
        } finally {
            setDeletingId(null);
        }
    }

    if (creating) {
        return (
            <NewSession
                onClose={() => setCreating(false)}
                onStarted={(session) => {
                    setCreating(false);
                    navigate(`/sessions/${session.id}`);
                }}
            />
        );
    }

    const projectNames = new Map(repositories.map((repository) => [repository.id, repository.name]));
    const showEmpty = !sessionsLoading && sessions.length === 0;

    return (
        <div className={styles.root}>
            <PageHeader crumbs={[{ label: intl.formatMessage(messages.sessionsCrumb) }]} />
            <div className={showEmpty || sessionsLoading ? styles.bodyEmpty : styles.body}>
                {sessionsLoading ? (
                    <p className={styles.placeholder}>{intl.formatMessage(messages.loadingSessions)}</p>
                ) : null}
                {showEmpty ? <p className={styles.placeholder}>{intl.formatMessage(messages.noSessions)}</p> : null}
                {!sessionsLoading
                    ? sessions.map((session, index) => (
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
            <div className={styles.footer}>
                <Button type='button' onClick={() => setCreating(true)}>
                    {intl.formatMessage(messages.newSession)}
                </Button>
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
