import { IconButton } from '@client/components/icon-button';
import { PageHeader } from '@client/components/page-header';
import { AGENTS, type AgentId } from '@client/libs/agents/agents';
import {
    connectSessionTerminal,
    getSession,
    sendTerminalMessage,
    type ServerTerminalMessage,
    type Session,
    type SessionStatus,
} from '@client/libs/api/sessions';
import { showToast } from '@client/modules/toast';
import { FitAddon } from '@xterm/addon-fit';
import { Terminal } from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';
import { useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { messages } from './sessionView.messages';
import { styles } from './sessionView.styles';
import type { SessionViewProps } from './sessionView.types';

type ConnectionState = 'connecting' | 'connected' | 'disconnected';

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

function KeyboardIcon() {
    return (
        <svg
            className={styles.keyboardIcon}
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='1.75'
            aria-hidden='true'
        >
            <path
                strokeLinecap='round'
                strokeLinejoin='round'
                d='M4 6.75A1.75 1.75 0 0 1 5.75 5h12.5A1.75 1.75 0 0 1 20 6.75v10.5A1.75 1.75 0 0 1 18.25 19H5.75A1.75 1.75 0 0 1 4 17.25V6.75Z'
            />
            <path
                strokeLinecap='round'
                strokeLinejoin='round'
                d='M8 9h.01M12 9h.01M16 9h.01M8 12h.01M12 12h.01M16 12h.01M9.5 15.5h5'
            />
        </svg>
    );
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

export function SessionView({ projectSlug, projectName, sessionId }: SessionViewProps) {
    const intl = useIntl();
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [status, setStatus] = useState<SessionStatus>('busy');
    const [connection, setConnection] = useState<ConnectionState>('connecting');
    const terminalRef = useRef<HTMLDivElement | null>(null);
    const socketRef = useRef<WebSocket | null>(null);
    const termRef = useRef<Terminal | null>(null);

    useEffect(() => {
        let cancelled = false;

        getSession(sessionId)
            .then((item) => {
                if (cancelled) return;
                if (!item || item.repositoryId !== projectSlug) {
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
    }, [sessionId, projectSlug, intl]);

    useEffect(() => {
        if (loading || failed || !session || !terminalRef.current) {
            return;
        }

        const term = new Terminal({
            convertEol: true,
            disableStdin: false,
            cursorBlink: true,
            fontSize: 13,
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
            sendTerminalMessage(socket, { type: 'input', data });
        };

        const dataDisposable = term.onData(sendInput);

        const onResize = () => {
            try {
                fitAddon.fit();
                sendTerminalMessage(socket, {
                    type: 'resize',
                    cols: term.cols,
                    rows: term.rows,
                });
            } catch {
                // ignore fit errors while unmounted/hidden
            }
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
                term.write(parsed.data);
                return;
            }

            if (parsed.type === 'status') {
                setStatus(parsed.status);
            }
        });

        window.addEventListener('resize', onResize);
        const visualViewport = window.visualViewport;
        visualViewport?.addEventListener('resize', onResize);
        const observer = new ResizeObserver(onResize);
        observer.observe(terminalRef.current);

        return () => {
            window.removeEventListener('resize', onResize);
            visualViewport?.removeEventListener('resize', onResize);
            observer.disconnect();
            dataDisposable.dispose();
            socket.close();
            socketRef.current = null;
            term.dispose();
            termRef.current = null;
            setConnection('disconnected');
        };
    }, [loading, failed, session, intl]);

    function openKeyboard() {
        termRef.current?.focus();
    }

    const connected = connection === 'connected';
    const inputDisabled = !connected || status === 'error';

    if (loading) {
        return (
            <div className={styles.root}>
                <PageHeader
                    crumbs={[
                        { label: intl.formatMessage(messages.projectsCrumb), to: '/' },
                        { label: projectName, to: `/projects/${projectSlug}` },
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
                        { label: intl.formatMessage(messages.projectsCrumb), to: '/' },
                        { label: projectName, to: `/projects/${projectSlug}` },
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
                crumbs={[
                    { label: intl.formatMessage(messages.projectsCrumb), to: '/' },
                    { label: projectName, to: `/projects/${projectSlug}` },
                    { label: session.name },
                ]}
                showSettings={false}
            />
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
            <div className={styles.terminalWrap}>
                <div ref={terminalRef} className={styles.terminal} />
            </div>
            <div className={styles.keyboardBar}>
                <IconButton
                    label={intl.formatMessage(messages.openKeyboard)}
                    onClick={openKeyboard}
                    disabled={inputDisabled}
                >
                    <KeyboardIcon />
                </IconButton>
            </div>
        </div>
    );
}
