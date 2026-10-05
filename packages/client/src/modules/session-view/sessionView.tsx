import { PageHeader } from '@client/components/page-header';
import { PanelResizeHandle, panelResizeHandleMessages } from '@client/components/panel-resize-handle';
import { SegmentedControl } from '@client/components/segmented-control';
import { AGENTS, type AgentId } from '@client/libs/agents/agents';
import {
    connectSessionTerminal,
    getSession,
    getSessionDiff,
    sendTerminalMessage,
    type ServerTerminalMessage,
    type Session,
    type SessionStatus,
} from '@client/libs/api/sessions';
import { useIsDesktop } from '@client/libs/dom/useMediaQuery';
import {
    clampReviewPaneWidthPx,
    getReviewPaneWidthPx,
    getReviewPanelOpen,
    setReviewPanelOpen,
    setReviewPaneWidthPx,
} from '@client/libs/layout/reviewLayoutPreferences';
import { attachTouchScroll } from '@client/libs/terminal/touchScroll';
import { showToast } from '@client/modules/toast';
import { FitAddon } from '@xterm/addon-fit';
import { Terminal } from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';
import { messages } from './sessionView.messages';
import { styles } from './sessionView.styles';
import type { SessionViewProps } from './sessionView.types';

const SessionCodeView = lazy(async () => {
    const mod = await import('@client/modules/session-code-view');
    return { default: mod.SessionCodeView };
});

type ConnectionState = 'connecting' | 'connected' | 'disconnected';
type SessionTab = 'agent' | 'review';

function harnessLabel(agent: AgentId, formatMessage: ReturnType<typeof useIntl>['formatMessage']): string {
    const match = AGENTS.find((item) => item.id === agent);
    return match ? formatMessage(match.labelMessage) : agent;
}

function statusLabel(status: SessionStatus, formatMessage: ReturnType<typeof useIntl>['formatMessage']): string {
    switch (status) {
        case 'ready':
            return formatMessage(messages.statusReady);
        case 'busy':
            return formatMessage(messages.statusBusy);
        case 'error':
            return formatMessage(messages.statusError);
    }
}

function statusDotClass(status: SessionStatus): string {
    switch (status) {
        case 'ready':
            return styles.statusReady;
        case 'busy':
            return styles.statusBusy;
        case 'error':
            return styles.statusError;
    }
}

function prepareMobileTextarea(term: Terminal): void {
    const textarea = term.textarea;
    if (!textarea) return;
    textarea.setAttribute('inputmode', 'text');
    textarea.setAttribute('enterkeyhint', 'send');
    textarea.setAttribute('autocapitalize', 'off');
    textarea.setAttribute('autocomplete', 'off');
    textarea.setAttribute('autocorrect', 'off');
    textarea.setAttribute('spellcheck', 'false');
}

function isScrolledToBottom(term: Terminal): boolean {
    const buffer = term.buffer.active;
    return buffer.viewportY >= buffer.baseY;
}

function syncTerminalLayout(options: {
    host: HTMLElement | null;
    term: Terminal;
    fitAddon: FitAddon;
    socket?: WebSocket | null;
    refresh?: boolean;
    followOutput?: boolean;
}): void {
    const { host, term, fitAddon, socket, refresh, followOutput } = options;
    if (!host || host.clientWidth === 0 || host.clientHeight === 0) {
        return;
    }
    if (document.visibilityState === 'hidden') {
        return;
    }

    const stickToBottom = followOutput ?? isScrolledToBottom(term);
    try {
        fitAddon.fit();
        if (socket && socket.readyState === WebSocket.OPEN) {
            sendTerminalMessage(socket, {
                type: 'resize',
                cols: term.cols,
                rows: term.rows,
            });
        }
        if (refresh) {
            // Returning from a backgrounded tab can leave the cursor
            // painted at the wrong place until the renderer redraws.
            term.refresh(0, Math.max(0, term.rows - 1));
        }
        if (stickToBottom) {
            term.scrollToBottom();
        }
    } catch {
        // ignore fit errors while unmounted/hidden
    }
}

export function SessionView({ sessionId }: SessionViewProps) {
    const intl = useIntl();
    const navigate = useNavigate();
    const isDesktop = useIsDesktop();
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [status, setStatus] = useState<SessionStatus>('busy');
    const [connection, setConnection] = useState<ConnectionState>('connecting');
    const [tab, setTab] = useState<SessionTab>('agent');
    const [reviewVisited, setReviewVisited] = useState(false);
    const [hasReviewFiles, setHasReviewFiles] = useState(false);
    const [desktopReviewOpen, setDesktopReviewOpen] = useState(false);
    const [reviewPaneWidth, setReviewPaneWidth] = useState(getReviewPaneWidthPx);
    const reviewPaneWidthRef = useRef(reviewPaneWidth);
    const terminalRef = useRef<HTMLDivElement | null>(null);
    const socketRef = useRef<WebSocket | null>(null);
    const termRef = useRef<Terminal | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);

    const onHasFilesChange = useCallback((hasFiles: boolean) => {
        setHasReviewFiles(hasFiles);
    }, []);

    const showDesktopReview = isDesktop && desktopReviewOpen;

    reviewPaneWidthRef.current = reviewPaneWidth;

    const persistReviewPaneWidth = useCallback(() => {
        setReviewPaneWidthPx(reviewPaneWidthRef.current);
    }, []);

    function toggleDesktopReview() {
        setDesktopReviewOpen((open) => {
            const next = !open;
            setReviewPanelOpen(sessionId, next);
            if (next) {
                setReviewVisited(true);
            }
            return next;
        });
    }

    useEffect(() => {
        const storedOpen = getReviewPanelOpen(sessionId);
        setDesktopReviewOpen(storedOpen === true);
        setReviewVisited(storedOpen === true);
        setHasReviewFiles(false);
    }, [sessionId]);

    useEffect(() => {
        let cancelled = false;

        getSession(sessionId)
            .then((item) => {
                if (cancelled) return;
                if (!item) {
                    setFailed(true);
                    setSession(null);
                    showToast('generic-error', intl.formatMessage(messages.notFound));
                    return;
                }
                setSession(item);
                setStatus(item.status);
                setFailed(false);
            })
            .catch((err: unknown) => {
                if (!cancelled) {
                    setFailed(true);
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
    }, [sessionId, intl]);

    useEffect(() => {
        if (loading || failed || !session || !terminalRef.current) {
            return;
        }

        const term = new Terminal({
            convertEol: true,
            disableStdin: false,
            cursorBlink: true,
            fontSize: 13,
            scrollback: 10000,
            theme: {
                background: '#000000',
                foreground: '#e4e4e7',
            },
        });
        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        term.open(terminalRef.current);
        fitAddon.fit();
        prepareMobileTextarea(term);
        termRef.current = term;
        fitAddonRef.current = fitAddon;

        let socket: WebSocket;
        try {
            socket = connectSessionTerminal(session.id);
        } catch (err: unknown) {
            showToast('generic-error', err instanceof Error ? err.message : intl.formatMessage(messages.loadFailed));
            term.dispose();
            termRef.current = null;
            return;
        }

        socketRef.current = socket;
        setConnection('connecting');

        // Stick to the live prompt after the user types, even if a write
        // started while they were scrolled up in history.
        let followOutput = isScrolledToBottom(term);

        const scrollToBottomAndFollow = () => {
            followOutput = true;
            term.scrollToBottom();
        };

        const sendInput = (data: string) => {
            scrollToBottomAndFollow();
            if (socket.readyState !== WebSocket.OPEN) return;
            sendTerminalMessage(socket, { type: 'input', data });
        };

        const dataDisposable = term.onData(sendInput);
        const scrollDisposable = term.onScroll(() => {
            followOutput = isScrolledToBottom(term);
        });

        const onResize = () => {
            syncTerminalLayout({
                host: terminalRef.current,
                term,
                fitAddon,
                socket,
                followOutput,
            });
        };

        const onVisibilityOrFocus = () => {
            if (document.visibilityState === 'hidden') return;
            // Wait for layout to settle after the browser restores the tab.
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    syncTerminalLayout({
                        host: terminalRef.current,
                        term,
                        fitAddon,
                        socket,
                        refresh: true,
                        followOutput,
                    });
                });
            });
        };

        socket.addEventListener('open', () => {
            setConnection('connected');
            onResize();
        });

        socket.addEventListener('close', () => {
            setConnection('disconnected');
        });

        socket.addEventListener('message', (event) => {
            let parsed: ServerTerminalMessage;
            try {
                parsed = JSON.parse(String(event.data)) as ServerTerminalMessage;
            } catch {
                return;
            }

            if (parsed.type === 'history' || parsed.type === 'output') {
                const stickToBottom = parsed.type === 'history' || followOutput;
                term.write(parsed.data, () => {
                    if (stickToBottom || followOutput) {
                        term.scrollToBottom();
                    }
                });
                return;
            }

            if (parsed.type === 'status') {
                setStatus(parsed.status);
            }
        });

        window.addEventListener('resize', onResize);
        window.addEventListener('focus', onVisibilityOrFocus);
        document.addEventListener('visibilitychange', onVisibilityOrFocus);
        const visualViewport = window.visualViewport;
        visualViewport?.addEventListener('resize', onResize);
        const observer = new ResizeObserver(onResize);
        observer.observe(terminalRef.current);
        const detachTouchScroll = attachTouchScroll(terminalRef.current, term);

        return () => {
            window.removeEventListener('resize', onResize);
            window.removeEventListener('focus', onVisibilityOrFocus);
            document.removeEventListener('visibilitychange', onVisibilityOrFocus);
            visualViewport?.removeEventListener('resize', onResize);
            observer.disconnect();
            detachTouchScroll();
            dataDisposable.dispose();
            scrollDisposable.dispose();
            socket.close();
            socketRef.current = null;
            term.dispose();
            termRef.current = null;
            fitAddonRef.current = null;
            setConnection('disconnected');
        };
    }, [loading, failed, session, intl]);

    useEffect(() => {
        if (!session || session.type !== 'coding') {
            setHasReviewFiles(false);
            return;
        }

        let cancelled = false;

        const check = () => {
            getSessionDiff(session.id)
                .then((diff) => {
                    if (!cancelled) {
                        setHasReviewFiles(diff.files.length > 0);
                    }
                })
                .catch(() => {
                    // Keep the last known state; tab enablement is best-effort.
                });
        };

        check();
        const timer = window.setInterval(check, 4000);
        return () => {
            cancelled = true;
            window.clearInterval(timer);
        };
    }, [session]);

    useEffect(() => {
        if (!hasReviewFiles) {
            return;
        }

        setReviewVisited(true);

        const storedOpen = getReviewPanelOpen(sessionId);
        if (storedOpen === null) {
            setDesktopReviewOpen(true);
            setReviewPanelOpen(sessionId, true);
        }
    }, [hasReviewFiles, sessionId]);

    useEffect(() => {
        if (!hasReviewFiles && tab === 'review') {
            setTab('agent');
        }
    }, [hasReviewFiles, tab]);

    useEffect(() => {
        if (!isDesktop && tab !== 'agent') return;
        const fitAddon = fitAddonRef.current;
        const term = termRef.current;
        if (!fitAddon || !term) return;

        requestAnimationFrame(() => {
            syncTerminalLayout({
                host: terminalRef.current,
                term,
                fitAddon,
                socket: socketRef.current,
                refresh: true,
            });
        });
    }, [tab, isDesktop, showDesktopReview, reviewPaneWidth]);

    if (loading) {
        return (
            <div className={styles.root}>
                <PageHeader
                    crumbs={[
                        { label: intl.formatMessage(messages.sessionsCrumb), to: '/' },
                        { label: intl.formatMessage(messages.loadingCrumb) },
                    ]}
                    showSettings={false}
                    onBack={() => navigate('/')}
                />
                <p className={styles.centered}>{intl.formatMessage(messages.loading)}</p>
            </div>
        );
    }

    if (failed || !session) {
        return (
            <div className={styles.root}>
                <PageHeader
                    crumbs={[
                        { label: intl.formatMessage(messages.sessionsCrumb), to: '/' },
                        { label: intl.formatMessage(messages.notFound) },
                    ]}
                    showSettings={false}
                    onBack={() => navigate('/')}
                />
                <p className={styles.centered}>{intl.formatMessage(messages.notFound)}</p>
            </div>
        );
    }

    const connectionLabel =
        connection === 'connecting'
            ? intl.formatMessage(messages.connecting)
            : connection === 'disconnected'
              ? intl.formatMessage(messages.disconnected)
              : null;

    return (
        <div className={styles.root}>
            <PageHeader
                crumbs={[{ label: intl.formatMessage(messages.sessionsCrumb), to: '/' }, { label: session.name }]}
                showSettings={false}
                onBack={() => navigate('/')}
            />
            {session.type === 'coding' && !isDesktop ? (
                <div className={styles.tabs}>
                    <SegmentedControl
                        ariaLabel={intl.formatMessage(messages.viewTabs)}
                        value={tab}
                        onChange={(next) => {
                            setTab(next);
                            if (next === 'review') {
                                setReviewVisited(true);
                            }
                        }}
                        options={[
                            { value: 'agent', label: intl.formatMessage(messages.agentView) },
                            {
                                value: 'review',
                                label: intl.formatMessage(messages.reviewView),
                                disabled: !hasReviewFiles,
                            },
                        ]}
                    />
                </div>
            ) : null}
            <div className={styles.meta}>
                <p className={styles.metaText}>
                    {session.type === 'coding'
                        ? intl.formatMessage(messages.meta, {
                              harness: harnessLabel(session.agent, intl.formatMessage),
                              branch: session.branch ?? '',
                          })
                        : intl.formatMessage(messages.metaConversation, {
                              harness: harnessLabel(session.agent, intl.formatMessage),
                          })}
                    {connectionLabel ? ` · ${connectionLabel}` : ''}
                </p>
                <div className={styles.metaEnd}>
                    {session.type === 'coding' ? (
                        <button type='button' className={styles.reviewToggle} onClick={toggleDesktopReview}>
                            {intl.formatMessage(desktopReviewOpen ? messages.closeReview : messages.openReview)}
                        </button>
                    ) : null}
                    <span className={styles.status}>
                        <span className={`${styles.statusDot} ${statusDotClass(status)}`} aria-hidden='true' />
                        {statusLabel(status, intl.formatMessage)}
                    </span>
                </div>
            </div>
            <div className={styles.content}>
                <div
                    className={
                        session.type === 'conversation' || isDesktop || tab === 'agent'
                            ? styles.pane
                            : styles.paneInactive
                    }
                    aria-hidden={session.type === 'coding' && !isDesktop && tab !== 'agent'}
                >
                    <div className={styles.terminalWrap}>
                        <div ref={terminalRef} className={styles.terminal} />
                    </div>
                </div>
                {session.type === 'coding' && reviewVisited && (!isDesktop || showDesktopReview) ? (
                    <div
                        className={isDesktop || tab === 'review' ? styles.paneReview : styles.paneInactive}
                        aria-hidden={!isDesktop && tab !== 'review'}
                        style={isDesktop && showDesktopReview ? { width: reviewPaneWidth } : undefined}
                    >
                        {isDesktop && showDesktopReview ? (
                            <PanelResizeHandle
                                edge='leading'
                                ariaLabel={intl.formatMessage(panelResizeHandleMessages.resizeReviewPanel)}
                                onResize={(delta) =>
                                    setReviewPaneWidth((width) => clampReviewPaneWidthPx(width - delta))
                                }
                                onResizeEnd={persistReviewPaneWidth}
                            />
                        ) : null}
                        <div className={styles.reviewBody}>
                            <Suspense
                                fallback={<p className={styles.centered}>{intl.formatMessage(messages.loading)}</p>}
                            >
                                <SessionCodeView sessionId={session.id} onHasFilesChange={onHasFilesChange} />
                            </Suspense>
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
