import { Button } from '@client/components/button';
import { Card } from '@client/components/card';
import { ConfirmDialog } from '@client/components/confirm-dialog';
import { PageHeader } from '@client/components/page-header';
import { SwipeToDelete } from '@client/components/swipe-to-delete';
import { AGENTS, type AgentId } from '@client/libs/agents/agents';
import { getRepository } from '@client/libs/api/repositories';
import { deleteSession, listSessions, type Session } from '@client/libs/api/sessions';
import { NewSession } from '@client/modules/new-session';
import { showToast } from '@client/modules/toast';
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { useNavigate, useParams } from 'react-router-dom';
import { messages } from './projectPage.messages';
import { styles } from './projectPage.styles';

const POLL_MS = 2000;

function harnessLabel(agent: AgentId, formatMessage: ReturnType<typeof useIntl>['formatMessage']): string {
    const match = AGENTS.find((item) => item.id === agent);
    return match ? formatMessage(match.labelMessage) : agent;
}

export function ProjectPage() {
    const intl = useIntl();
    const navigate = useNavigate();
    const { slug } = useParams<{ slug: string }>();
    const [name, setName] = useState<string | null>(null);
    const [failed, setFailed] = useState(false);
    const [creating, setCreating] = useState(false);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [sessionsLoading, setSessionsLoading] = useState(true);
    const [revealedId, setRevealedId] = useState<string | null>(null);
    const [pendingDelete, setPendingDelete] = useState<Session | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        if (!slug) {
            setName(null);
            setFailed(true);
            showToast('generic-error', intl.formatMessage(messages.notFound));
            return;
        }

        let cancelled = false;

        getRepository(slug)
            .then((repository) => {
                if (cancelled) return;
                if (!repository) {
                    setName(null);
                    setFailed(true);
                    showToast('generic-error', intl.formatMessage(messages.notFound));
                    return;
                }
                setName(repository.name);
                setFailed(false);
            })
            .catch((err: unknown) => {
                if (!cancelled) {
                    setName(null);
                    setFailed(true);
                    showToast(
                        'generic-error',
                        err instanceof Error ? err.message : intl.formatMessage(messages.loadFailed),
                    );
                }
            });

        return () => {
            cancelled = true;
        };
    }, [slug, intl]);

    useEffect(() => {
        if (!slug || failed) {
            setSessions([]);
            setSessionsLoading(false);
            return;
        }

        let cancelled = false;
        let timer: ReturnType<typeof setTimeout> | undefined;

        async function refresh(initial: boolean) {
            try {
                const items = await listSessions(slug!);
                if (cancelled) return;
                setSessions(items);
            } catch (err: unknown) {
                if (!cancelled && initial) {
                    showToast(
                        'generic-error',
                        err instanceof Error ? err.message : intl.formatMessage(messages.sessionsLoadFailed),
                    );
                }
            } finally {
                if (!cancelled && initial) {
                    setSessionsLoading(false);
                }
                if (!cancelled) {
                    timer = setTimeout(() => {
                        void refresh(false);
                    }, POLL_MS);
                }
            }
        }

        setSessionsLoading(true);
        void refresh(true);

        return () => {
            cancelled = true;
            if (timer) clearTimeout(timer);
        };
    }, [slug, failed, intl]);

    async function confirmDelete() {
        const session = pendingDelete;
        if (!session || deletingId) return;

        setDeletingId(session.id);
        setRevealedId(null);
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

    if (creating && name && slug) {
        return (
            <NewSession
                projectName={name}
                repositoryId={slug}
                onClose={() => setCreating(false)}
                onStarted={(session) => {
                    setCreating(false);
                    navigate(`/projects/${slug}/sessions/${session.id}`);
                }}
            />
        );
    }

    const showEmpty = !failed && !sessionsLoading && sessions.length === 0;

    return (
        <main className={styles.main}>
            <PageHeader
                crumbs={[
                    { label: intl.formatMessage(messages.projectsCrumb), to: '/' },
                    { label: name ?? intl.formatMessage(messages.loadingCrumb) },
                ]}
            />
            <div className={showEmpty || sessionsLoading ? styles.bodyEmpty : styles.body}>
                {sessionsLoading ? (
                    <p className={styles.placeholder}>{intl.formatMessage(messages.loadingSessions)}</p>
                ) : null}
                {showEmpty ? <p className={styles.placeholder}>{intl.formatMessage(messages.noSessions)}</p> : null}
                {!sessionsLoading && !failed
                    ? sessions.map((session) => (
                          <SwipeToDelete
                              key={session.id}
                              deleteLabel={intl.formatMessage(messages.deleteSession)}
                              open={revealedId === session.id}
                              onOpenChange={(open) => setRevealedId(open ? session.id : null)}
                              disabled={deletingId === session.id}
                              onDelete={() => {
                                  setPendingDelete(session);
                              }}
                          >
                              <Card
                                  title={session.name}
                                  indicator={session.status}
                                  onClick={() => navigate(`/projects/${slug}/sessions/${session.id}`)}
                              >
                                  {intl.formatMessage(messages.sessionMeta, {
                                      harness: harnessLabel(session.agent, intl.formatMessage),
                                      branch: session.branch,
                                  })}
                              </Card>
                          </SwipeToDelete>
                      ))
                    : null}
            </div>
            {!failed ? (
                <div className={styles.footer}>
                    <Button type='button' onClick={() => setCreating(true)} disabled={!name}>
                        {intl.formatMessage(messages.newSession)}
                    </Button>
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
        </main>
    );
}
