import { PageHeader } from '@client/components/page-header';
import { SegmentedControl } from '@client/components/segmented-control';
import { AGENTS, type AgentId } from '@client/libs/agents/agents';
import {
    connectSessionTerminal,
    getSession,
    sendTerminalMessage,
    type ServerTerminalMessage,
    type Session,
    type SessionStatus,
} from '@client/libs/api/sessions';
import { attachTouchScroll } from '@client/libs/terminal/touchScroll';
import { showToast } from '@client/modules/toast';
import { FitAddon } from '@xterm/addon-fit';
import { Terminal } from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
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
}): void {
    const { host, term, fitAddon, socket, refresh } = options;
    if (!host || host.clientWidth === 0 || host.clientHeight === 0) {
        return;
    }
    if (document.visibilityState === 'hidden') {
        return;
    }

    const stickToBottom = isScrolledToBottom(term);
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
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [status, setStatus] = useState<SessionStatus>('busy');
    const [connection, setConnection] = useState<ConnectionState>('connecting');
    const [tab, setTab] = useState<SessionTab>('agent');
    const [reviewVisited, setReviewVisited] = useState(false);
    const terminalRef = useRef<HTMLDivElement | null>(null);
    const socketRef = useRef<WebSocket | null>(null);
    const termRef = useRef<Terminal | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);

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

        const sendInput = (data: string) => {
            if (socket.readyState !== WebSocket.OPEN) return;
            // Keep the prompt/response in view after the user types.
            term.scrollToBottom();
            sendTerminalMessage(socket, { type: 'input', data });
        };

        const dataDisposable = term.onData(sendInput);

        const onResize = () => {
            syncTerminalLayout({
                host: terminalRef.current,
                term,
                fitAddon,
                socket,
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
                const stickToBottom = parsed.type === 'history' || isScrolledToBottom(term);
                term.write(parsed.data, () => {
                    if (stickToBottom) {
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
            socket.close();
            socketRef.current = null;
            term.dispose();
            termRef.current = null;
            fitAddonRef.current = null;
            setConnection('disconnected');
        };
    }, [loading, failed, session, intl]);

    useEffect(() => {
        if (tab !== 'agent') return;
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
    }, [tab]);

    if (loading) {
        return (
            <div className={styles.root}>
                <PageHeader
                    crumbs={[
                        { label: intl.formatMessage(messages.sessionsCrumb), to: '/' },
                        { label: intl.formatMessage(messages.loadingCrumb) },
                    ]}
                    showSettings={false}
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
            />
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
                        { value: 'review', label: intl.formatMessage(messages.reviewView) },
                    ]}
                />
            </div>
            <div className={styles.meta}>
                <p className={styles.metaText}>
                    {intl.formatMessage(messages.meta, {
                        harness: harnessLabel(session.agent, intl.formatMessage),
                        branch: session.branch,
                    })}
                    {connectionLabel ? ` · ${connectionLabel}` : ''}
                </p>
                <span className={styles.status}>
                    <span className={`${styles.statusDot} ${statusDotClass(status)}`} aria-hidden='true' />
                    {statusLabel(status, intl.formatMessage)}
                </span>
            </div>
            <div className={styles.content}>
                <div className={tab === 'agent' ? styles.pane : styles.paneInactive} aria-hidden={tab !== 'agent'}>
                    <div className={styles.terminalWrap}>
                        <div ref={terminalRef} className={styles.terminal} />
                    </div>
                </div>
                {reviewVisited ? (
                    <div
                        className={tab === 'review' ? styles.pane : styles.paneInactive}
                        aria-hidden={tab !== 'review'}
                    >
                        <Suspense fallback={<p className={styles.centered}>{intl.formatMessage(messages.loading)}</p>}>
                            <SessionCodeView sessionId={session.id} />
                        </Suspense>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
