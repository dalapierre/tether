import { Button } from '@client/components/button';
import { Card } from '@client/components/card';
import { ConfirmDialog } from '@client/components/confirm-dialog';
import { PageHeader } from '@client/components/page-header';
import { SwipeToDelete } from '@client/components/swipe-to-delete';
import { listRepositories, type Repository } from '@client/libs/api/repositories';
import { deleteSession, listSessions, type Session } from '@client/libs/api/sessions';
import { NewSession } from '@client/modules/new-session';
import { showToast } from '@client/modules/toast';
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';
import { messages } from './sessionList.messages';
import { styles } from './sessionList.styles';

export function SessionList() {
    const intl = useIntl();
    const navigate = useNavigate();
    const [creating, setCreating] = useState(false);
    const [repositories, setRepositories] = useState<Repository[]>([]);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [sessionsLoading, setSessionsLoading] = useState(true);
    const [pendingDelete, setPendingDelete] = useState<Session | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

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
                    ? sessions.map((session) => (
                          <SwipeToDelete
                              key={session.id}
                              disabled={deletingId === session.id}
                              onDelete={() => {
                                  setPendingDelete(session);
                              }}
                          >
                              <Card
                                  title={session.name}
                                  indicator={session.status}
                                  onClick={() => navigate(`/sessions/${session.id}`)}
                              >
                                  {session.type === 'coding' ? (
                                      <>
                                          <span className={styles.project}>
                                              {projectNames.get(session.repositoryId ?? '') ?? session.repositoryId}
                                          </span>
                                          <span className={styles.feature}>{session.branch}</span>
                                      </>
                                  ) : (
                                      <span className={styles.feature}>
                                          {intl.formatMessage(messages.conversationSession)}
                                      </span>
                                  )}
                              </Card>
                          </SwipeToDelete>
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
