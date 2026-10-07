import { Button } from '@client/components/button';
import { IconButton } from '@client/components/icon-button';
import { PageHeader } from '@client/components/page-header';
import { PanelResizeHandle, panelResizeHandleMessages } from '@client/components/panel-resize-handle';
import { SegmentedControl } from '@client/components/segmented-control';
import { agentLabelMessage, type AgentId } from '@client/libs/agents/agents';
import { getRepository } from '@client/libs/api/repositories';
import {
    connectSessionShell,
    connectSessionTerminal,
    getSession,
    getSessionDiff,
    sendTerminalMessage,
    type ServerTerminalMessage,
    type Session,
} from '@client/libs/api/sessions';
import { bindSessionViewport } from '@client/libs/dom/bindSessionViewport';
import { useIsDesktop } from '@client/libs/dom/useMediaQuery';
import {
    isTerminalInsertTarget,
    useKeybind,
    useKeybindChord,
    useKeybinds,
    withSuperModifier,
} from '@client/libs/keybinds';
import {
    clampReviewPaneWidthPct,
    clampShellPaneHeightPct,
    deltaPxToPct,
    getReviewPaneWidthPct,
    getReviewPanelOpen,
    getSelectedDiffPath,
    getShellPaneHeightPct,
    getShellPanelOpen,
    setReviewPanelOpen,
    setReviewPaneWidthPct,
    setShellPaneHeightPct,
    setShellPanelOpen,
} from '@client/libs/layout/reviewLayoutPreferences';
import { attachTouchScroll } from '@client/libs/terminal/touchScroll';
import { AURA_TERMINAL_THEME } from '@client/libs/theme/aura';
import { Spinner } from '@client/components/spinner';
import { showToast } from '@client/modules/toast';
import { FitAddon } from '@xterm/addon-fit';
import { Terminal } from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';
import { Suspense, lazy, useCallback, useEffect, useLayoutEffect, useRef, useState, type ClipboardEvent } from 'react';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';
import { messages } from './sessionView.messages';
import { styles } from './sessionView.styles';
import type { SessionViewProps } from './sessionView.types';

const SessionCodeView = lazy(() =>
    import('@client/modules/session-code-view').then((m) => ({ default: m.SessionCodeView })),
);

type ConnectionState = 'connecting' | 'connected' | 'disconnected';
type SessionTab = 'agent' | 'terminal' | 'review';

const ARROW_UP = '\x1b[A';
const ARROW_DOWN = '\x1b[B';
/** Readline unix-line-discard — clears the current prompt input. */
const CLEAR_INPUT = '\x15';

function ArrowUpIcon() {
    return (
        <svg
            className={styles.actionIcon}
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            aria-hidden='true'
        >
            <path strokeLinecap='round' strokeLinejoin='round' d='M4.5 15.75 12 8.25l7.5 7.5' />
        </svg>
    );
}

function ArrowDownIcon() {
    return (
        <svg
            className={styles.actionIcon}
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            aria-hidden='true'
        >
            <path strokeLinecap='round' strokeLinejoin='round' d='M19.5 8.25 12 15.75 4.5 8.25' />
        </svg>
    );
}

function PasteIcon() {
    return (
        <svg
            className={styles.actionIcon}
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='1.75'
            aria-hidden='true'
        >
            <path
                strokeLinecap='round'
                strokeLinejoin='round'
                d='M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9.75a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184'
            />
        </svg>
    );
}

function ClearInputIcon() {
    return (
        <svg
            className={styles.actionIcon}
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

function TerminalIcon({ className }: { className?: string }) {
    return (
        <svg
            className={className ?? styles.actionIcon}
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='1.75'
            aria-hidden='true'
        >
            <path
                strokeLinecap='round'
                strokeLinejoin='round'
                d='M6.75 7.5 3 12l3.75 4.5M12.75 16.5h4.5M5.25 4.5h13.5A1.5 1.5 0 0 1 20.25 6v12a1.5 1.5 0 0 1-1.5 1.5H5.25A1.5 1.5 0 0 1 3.75 18V6A1.5 1.5 0 0 1 5.25 4.5Z'
            />
        </svg>
    );
}

function ReviewIcon({ className }: { className?: string }) {
    return (
        <svg
            className={className ?? styles.actionIcon}
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='1.75'
            aria-hidden='true'
        >
            <path
                strokeLinecap='round'
                strokeLinejoin='round'
                d='M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125V4.875a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z'
            />
        </svg>
    );
}

function harnessLabel(agent: AgentId, formatMessage: ReturnType<typeof useIntl>['formatMessage']): string {
    return formatMessage(agentLabelMessage(agent));
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
    // Mobile Safari scrolls the helper textarea into view on focus, which
    // pans the visual viewport and leaves a blank gap above the keyboard.
    textarea.scrollIntoView = () => {};
    const undoFocusScroll = () => {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
    };
    textarea.addEventListener('focus', () => {
        undoFocusScroll();
        requestAnimationFrame(undoFocusScroll);
        // Keyboard animation can pan again after the first frame.
        window.setTimeout(undoFocusScroll, 50);
        window.setTimeout(undoFocusScroll, 300);
    });
}

function isScrolledToBottom(term: Terminal): boolean {
    const buffer = term.buffer.active;
    return buffer.viewportY >= buffer.baseY;
}

/** Keep in sync with server PTY resize clamp in sessions/store.ts */
const MAX_TERMINAL_COLS = 300;

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
        // Cap cols to the PTY max so a narrower screen can be centered in wide hosts.
        if (term.cols > MAX_TERMINAL_COLS) {
            term.resize(MAX_TERMINAL_COLS, term.rows);
        }
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
    const [connection, setConnection] = useState<ConnectionState>('connecting');
    const [tab, setTab] = useState<SessionTab>('agent');
    const [reviewVisited, setReviewVisited] = useState(false);
    const [shellVisited, setShellVisited] = useState(false);
    const [hasReviewFiles, setHasReviewFiles] = useState(false);
    const [desktopReviewOpen, setDesktopReviewOpen] = useState(false);
    const [desktopShellOpen, setDesktopShellOpen] = useState(false);
    const [reviewPaneWidthPct, setReviewPaneWidthPctState] = useState(getReviewPaneWidthPct);
    const [shellPaneHeightPct, setShellPaneHeightPctState] = useState(getShellPaneHeightPct);
    const [repositoryName, setRepositoryName] = useState<string | null>(null);
    const [pasteOpen, setPasteOpen] = useState(false);
    const reviewPaneWidthPctRef = useRef(reviewPaneWidthPct);
    const shellPaneHeightPctRef = useRef(shellPaneHeightPct);
    const rootRef = useRef<HTMLDivElement | null>(null);
    const contentRef = useRef<HTMLDivElement | null>(null);
    const mainRef = useRef<HTMLDivElement | null>(null);
    const terminalRef = useRef<HTMLDivElement | null>(null);
    const shellTerminalRef = useRef<HTMLDivElement | null>(null);
    const socketRef = useRef<WebSocket | null>(null);
    const shellSocketRef = useRef<WebSocket | null>(null);
    const termRef = useRef<Terminal | null>(null);
    const shellTermRef = useRef<Terminal | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);
    const shellFitAddonRef = useRef<FitAddon | null>(null);
    const sendInputRef = useRef<(data: string) => void>(() => {});
    const pasteInputRef = useRef<HTMLTextAreaElement | null>(null);
    const reviewPaneRef = useRef<HTMLDivElement | null>(null);
    const prevShellPaneVisibleRef = useRef(false);
    const prevReviewPaneVisibleRef = useRef(false);

    const onHasFilesChange = useCallback((hasFiles: boolean) => {
        setHasReviewFiles(hasFiles);
    }, []);

    const showDesktopReview = isDesktop && desktopReviewOpen;
    const showDesktopShell = isDesktop && desktopShellOpen;
    const reviewPaneVisible = isDesktop ? showDesktopReview : tab === 'review';
    const shellPaneVisible = isDesktop ? showDesktopShell : tab === 'terminal';
    const sessionReady = Boolean(session && !loading && !failed);

    reviewPaneWidthPctRef.current = reviewPaneWidthPct;
    shellPaneHeightPctRef.current = shellPaneHeightPct;

    const persistReviewPaneWidth = useCallback(() => {
        setReviewPaneWidthPct(reviewPaneWidthPctRef.current);
    }, []);

    const persistShellPaneHeight = useCallback(() => {
        setShellPaneHeightPct(shellPaneHeightPctRef.current);
    }, []);

    function blurFocusInsideReview() {
        const active = document.activeElement;
        if (active instanceof HTMLElement && reviewPaneRef.current?.contains(active)) {
            active.blur();
        }
    }

    function toggleDesktopReview() {
        if (desktopReviewOpen) {
            // Blur before the pane is display:none'd so the browser doesn't
            // move focus onto an xterm helper textarea (insert mode).
            blurFocusInsideReview();
        }
        setDesktopReviewOpen((open) => {
            const next = !open;
            setReviewPanelOpen(sessionId, next);
            if (next) {
                setReviewVisited(true);
            }
            return next;
        });
    }

    function toggleShell() {
        if (isDesktop) {
            setDesktopShellOpen((open) => {
                const next = !open;
                setShellPanelOpen(sessionId, next);
                if (next) {
                    setShellVisited(true);
                }
                return next;
            });
            return;
        }

        setTab((current) => {
            if (current === 'terminal') {
                return 'agent';
            }
            setShellVisited(true);
            return 'terminal';
        });
    }

    useKeybind('session', 'goBack', () => navigate('/', { replace: true }), { enabled: sessionReady });
    useKeybind(
        'session',
        'toggleReview',
        () => {
            if (session?.type !== 'coding') return;
            if (isDesktop) {
                toggleDesktopReview();
                return;
            }
            if (tab === 'review') {
                blurFocusInsideReview();
            }
            setTab((current) => {
                if (current === 'review') return 'agent';
                setReviewVisited(true);
                return 'review';
            });
        },
        { enabled: sessionReady },
    );
    useKeybind('session', 'toggleTerminal', () => toggleShell(), {
        enabled: sessionReady,
        allowInTerminalInsert: true,
    });
    const { keybinds } = useKeybinds();
    const enterInsertChord = keybinds.session.toggleAgentInsert;
    const exitInsertChord = withSuperModifier(enterInsertChord);
    const insertUsesSameChord = enterInsertChord.trim() === exitInsertChord.trim();

    useKeybindChord(
        enterInsertChord,
        () => {
            const term = termRef.current;
            const insertActive = Boolean(term?.textarea) && document.activeElement === term?.textarea;

            if (insertActive) {
                // Same chord for enter/exit (already includes super) — toggle out.
                if (insertUsesSameChord) {
                    term?.blur();
                }
                return;
            }

            if (!isDesktop) {
                setTab('agent');
            }
            // Wait a frame so the agent pane is visible before focusing.
            requestAnimationFrame(() => {
                focusTerminal();
            });
        },
        { enabled: sessionReady, allowInTerminalInsert: insertUsesSameChord },
    );
    useKeybindChord(
        exitInsertChord,
        () => {
            termRef.current?.blur();
            shellTermRef.current?.blur();
        },
        { enabled: sessionReady && !insertUsesSameChord, requireTerminalInsert: true },
    );
    useKeybind(
        'session',
        'enterShellInsert',
        () => {
            if (!shellPaneVisible) return;
            requestAnimationFrame(() => {
                focusShellTerminal();
            });
        },
        { enabled: sessionReady },
    );

    useEffect(() => {
        const storedOpen = getReviewPanelOpen(sessionId);
        setDesktopReviewOpen(storedOpen === true);
        setReviewVisited(storedOpen === true);
        setHasReviewFiles(false);

        const storedShellOpen = getShellPanelOpen(sessionId);
        setDesktopShellOpen(storedShellOpen === true);
        setShellVisited(storedShellOpen === true);
        setTab('agent');
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
        const repositoryId = session?.repositoryId;
        if (!repositoryId) {
            setRepositoryName(null);
            return;
        }

        let cancelled = false;
        getRepository(repositoryId)
            .then((repository) => {
                if (!cancelled) {
                    setRepositoryName(repository?.name ?? repositoryId);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setRepositoryName(repositoryId);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [session?.repositoryId]);

    useEffect(() => {
        if (isDesktop || !rootRef.current) return;
        return bindSessionViewport(rootRef.current);
    }, [isDesktop, loading, failed, session]);

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
            theme: AURA_TERMINAL_THEME,
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
        sendInputRef.current = sendInput;

        const dataDisposable = term.onData(sendInput);
        const scrollDisposable = term.onScroll(() => {
            followOutput = isScrolledToBottom(term);
        });

        const onResize = () => {
            // Wait a frame so bindSessionViewport has applied visualViewport layout.
            requestAnimationFrame(() => {
                syncTerminalLayout({
                    host: terminalRef.current,
                    term,
                    fitAddon,
                    socket,
                    followOutput,
                });
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
            sendInputRef.current = () => {};
            term.dispose();
            termRef.current = null;
            fitAddonRef.current = null;
            setConnection('disconnected');
        };
    }, [loading, failed, session, intl]);

    useEffect(() => {
        if (loading || failed || !session || !shellVisited || !shellTerminalRef.current) {
            return;
        }

        const term = new Terminal({
            convertEol: true,
            disableStdin: false,
            cursorBlink: true,
            fontSize: 13,
            scrollback: 10000,
            theme: AURA_TERMINAL_THEME,
        });
        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        term.open(shellTerminalRef.current);
        fitAddon.fit();
        prepareMobileTextarea(term);
        shellTermRef.current = term;
        shellFitAddonRef.current = fitAddon;

        let socket: WebSocket;
        try {
            socket = connectSessionShell(session.id);
        } catch (err: unknown) {
            showToast('generic-error', err instanceof Error ? err.message : intl.formatMessage(messages.loadFailed));
            term.dispose();
            shellTermRef.current = null;
            return;
        }

        shellSocketRef.current = socket;

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
            requestAnimationFrame(() => {
                syncTerminalLayout({
                    host: shellTerminalRef.current,
                    term,
                    fitAddon,
                    socket,
                    followOutput,
                });
            });
        };

        const onVisibilityOrFocus = () => {
            if (document.visibilityState === 'hidden') return;
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    syncTerminalLayout({
                        host: shellTerminalRef.current,
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
            onResize();
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
            }
        });

        window.addEventListener('resize', onResize);
        window.addEventListener('focus', onVisibilityOrFocus);
        document.addEventListener('visibilitychange', onVisibilityOrFocus);
        const visualViewport = window.visualViewport;
        visualViewport?.addEventListener('resize', onResize);
        const observer = new ResizeObserver(onResize);
        observer.observe(shellTerminalRef.current);
        const detachTouchScroll = attachTouchScroll(shellTerminalRef.current, term);

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
            shellSocketRef.current = null;
            term.dispose();
            shellTermRef.current = null;
            shellFitAddonRef.current = null;
        };
    }, [loading, failed, session, intl, shellVisited]);

    function focusTerminal() {
        termRef.current?.focus();
    }

    function focusShellTerminal() {
        shellTermRef.current?.focus();
    }

    function applyPaste(text: string) {
        if (!text) return;
        const term = termRef.current;
        if (term) {
            term.paste(text);
            term.focus();
        } else {
            sendInputRef.current(text);
        }
    }

    function sendArrowUp() {
        sendInputRef.current(ARROW_UP);
        focusTerminal();
    }

    function sendArrowDown() {
        sendInputRef.current(ARROW_DOWN);
        focusTerminal();
    }

    function clearPromptInput() {
        sendInputRef.current(CLEAR_INPUT);
        focusTerminal();
    }

    async function pasteFromClipboard() {
        // Mobile browsers usually block clipboard.readText(); go straight to
        // a paste sheet where a user-initiated paste event can supply the text.
        if (!isDesktop) {
            setPasteOpen(true);
            return;
        }

        try {
            if (navigator.clipboard?.readText) {
                const text = await navigator.clipboard.readText();
                if (text) {
                    applyPaste(text);
                    return;
                }
            }
        } catch {
            // Fall through to the paste sheet.
        }
        setPasteOpen(true);
    }

    function closePasteSheet() {
        setPasteOpen(false);
    }

    function submitPasteSheet() {
        const text = pasteInputRef.current?.value ?? '';
        setPasteOpen(false);
        applyPaste(text);
    }

    function onPasteSheetPaste(event: ClipboardEvent<HTMLTextAreaElement>) {
        const text = event.clipboardData.getData('text/plain');
        if (!text) return;
        event.preventDefault();
        setPasteOpen(false);
        applyPaste(text);
    }

    useEffect(() => {
        if (!pasteOpen) return;
        const frame = requestAnimationFrame(() => {
            const input = pasteInputRef.current;
            if (!input) return;
            input.value = '';
            input.focus();
        });
        return () => cancelAnimationFrame(frame);
    }, [pasteOpen]);

    useEffect(() => {
        if (!pasteOpen) return;

        function onKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                setPasteOpen(false);
            }
        }

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [pasteOpen]);

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

        // Return to the review tab when a file was open before refresh (mobile).
        if (!isDesktop && getSelectedDiffPath(sessionId)) {
            setTab('review');
        }
    }, [hasReviewFiles, sessionId, isDesktop]);

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
    }, [tab, isDesktop, showDesktopReview, showDesktopShell, reviewPaneWidthPct, shellPaneHeightPct]);

    useEffect(() => {
        // Focus only when the shell pane becomes visible — not on every layout
        // sync (e.g. review panel toggle / resize), which would steal focus into insert mode.
        const becameVisible = shellPaneVisible && !prevShellPaneVisibleRef.current;
        prevShellPaneVisibleRef.current = shellPaneVisible;

        if (!shellVisited) return;
        if (!isDesktop && tab !== 'terminal') return;
        if (isDesktop && !desktopShellOpen) return;

        const fitAddon = shellFitAddonRef.current;
        const term = shellTermRef.current;
        if (!fitAddon || !term) return;

        requestAnimationFrame(() => {
            syncTerminalLayout({
                host: shellTerminalRef.current,
                term,
                fitAddon,
                socket: shellSocketRef.current,
                refresh: true,
            });
            if (becameVisible) {
                term.focus();
            }
        });
    }, [tab, isDesktop, desktopShellOpen, shellVisited, shellPaneVisible, shellPaneHeightPct, showDesktopReview]);

    // If focus was inside the review pane when it hid, the browser may move it
    // onto a nearby xterm textarea. Undo that so closing review doesn't enter insert mode.
    useLayoutEffect(() => {
        const wasVisible = prevReviewPaneVisibleRef.current;
        prevReviewPaneVisibleRef.current = reviewPaneVisible;
        if (!wasVisible || reviewPaneVisible) return;
        if (isTerminalInsertTarget(document.activeElement)) {
            (document.activeElement as HTMLElement).blur();
        }
    }, [reviewPaneVisible]);

    if (loading) {
        return (
            <div ref={rootRef} className={styles.root}>
                <PageHeader
                    crumbs={[
                        { label: intl.formatMessage(messages.sessionsCrumb), to: '/' },
                        { label: intl.formatMessage(messages.loadingCrumb) },
                    ]}
                    showSettings={false}
                    onBack={() => navigate('/', { replace: true })}
                />
                <p className={styles.centered}>{intl.formatMessage(messages.loading)}</p>
            </div>
        );
    }

    if (failed || !session) {
        return (
            <div ref={rootRef} className={styles.root}>
                <PageHeader
                    crumbs={[
                        { label: intl.formatMessage(messages.sessionsCrumb), to: '/' },
                        { label: intl.formatMessage(messages.notFound) },
                    ]}
                    showSettings={false}
                    onBack={() => navigate('/', { replace: true })}
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
        <div ref={rootRef} className={styles.root}>
            <PageHeader
                crumbs={[{ label: intl.formatMessage(messages.sessionsCrumb), to: '/' }, { label: session.name }]}
                showSettings={false}
                onBack={() => navigate('/', { replace: true })}
                actions={
                    <div className={styles.mobileActions}>
                        <IconButton label={intl.formatMessage(messages.arrowUp)} onClick={sendArrowUp}>
                            <ArrowUpIcon />
                        </IconButton>
                        <IconButton label={intl.formatMessage(messages.arrowDown)} onClick={sendArrowDown}>
                            <ArrowDownIcon />
                        </IconButton>
                        <IconButton
                            label={intl.formatMessage(messages.paste)}
                            onClick={() => void pasteFromClipboard()}
                        >
                            <PasteIcon />
                        </IconButton>
                        <IconButton label={intl.formatMessage(messages.clearInput)} onClick={clearPromptInput}>
                            <ClearInputIcon />
                        </IconButton>
                    </div>
                }
            />
            {!isDesktop ? (
                <div className={styles.tabs}>
                    <SegmentedControl
                        ariaLabel={intl.formatMessage(messages.viewTabs)}
                        value={tab}
                        onChange={(next) => {
                            setTab(next);
                            if (next === 'terminal') {
                                setShellVisited(true);
                            }
                            if (next === 'review') {
                                setReviewVisited(true);
                            }
                        }}
                        options={[
                            { value: 'agent', label: intl.formatMessage(messages.agentView) },
                            { value: 'terminal', label: intl.formatMessage(messages.terminalView) },
                            ...(session.type === 'coding'
                                ? [
                                      {
                                          value: 'review' as const,
                                          label: intl.formatMessage(messages.reviewView),
                                      },
                                  ]
                                : []),
                        ]}
                    />
                </div>
            ) : null}
            <div className={styles.meta}>
                <p className={styles.metaText}>
                    {session.type === 'coding' ? (
                        <>
                            <span className={styles.metaRepo}>{repositoryName ?? session.repositoryId}</span>
                            {' > '}
                            {session.branch}
                            {session.behindDefault != null && session.behindDefault > 0 ? (
                                <>
                                    {' · '}
                                    <span className={styles.metaBehind}>
                                        {intl.formatMessage(messages.branchBehindDefault, {
                                            count: session.behindDefault,
                                        })}
                                    </span>
                                </>
                            ) : null}
                        </>
                    ) : (
                        intl.formatMessage(messages.metaConversation, {
                            harness: harnessLabel(session.agent, intl.formatMessage),
                        })
                    )}
                    {connectionLabel ? ` · ${connectionLabel}` : ''}
                </p>
                <div className={styles.metaEnd}>
                    <button
                        type='button'
                        className={`${styles.paneToggle}${shellPaneVisible ? ` ${styles.paneToggleActive}` : ''}`}
                        aria-label={intl.formatMessage(
                            shellPaneVisible ? messages.closeTerminal : messages.openTerminal,
                        )}
                        aria-pressed={shellPaneVisible}
                        onClick={toggleShell}
                    >
                        <TerminalIcon className={styles.paneToggleIcon} />
                    </button>
                    {session.type === 'coding' ? (
                        <button
                            type='button'
                            className={`${styles.paneToggle}${desktopReviewOpen ? ` ${styles.paneToggleActive}` : ''}`}
                            aria-label={intl.formatMessage(
                                desktopReviewOpen ? messages.closeReview : messages.openReview,
                            )}
                            aria-pressed={desktopReviewOpen}
                            onClick={toggleDesktopReview}
                        >
                            <ReviewIcon className={styles.paneToggleIcon} />
                        </button>
                    ) : null}
                </div>
            </div>
            <div ref={mainRef} className={styles.main}>
                <div
                    ref={contentRef}
                    className={styles.content}
                    style={
                        isDesktop && showDesktopReview
                            ? { gridTemplateColumns: `minmax(0, 1fr) ${reviewPaneWidthPct}%` }
                            : undefined
                    }
                >
                    <div
                        className={isDesktop || tab === 'agent' ? styles.pane : styles.paneInactive}
                        aria-hidden={!isDesktop && tab !== 'agent'}
                    >
                        <div className={styles.terminalWrap}>
                            <div ref={terminalRef} className={styles.terminal} />
                        </div>
                    </div>
                    {session.type === 'coding' && reviewVisited ? (
                        <div
                            ref={reviewPaneRef}
                            className={reviewPaneVisible ? styles.paneReview : styles.paneInactive}
                            aria-hidden={!reviewPaneVisible}
                        >
                            {isDesktop && showDesktopReview ? (
                                <PanelResizeHandle
                                    edge='leading'
                                    ariaLabel={intl.formatMessage(panelResizeHandleMessages.resizeReviewPanel)}
                                    onResize={(delta) =>
                                        setReviewPaneWidthPctState((pct) =>
                                            clampReviewPaneWidthPct(
                                                pct -
                                                    deltaPxToPct(
                                                        delta,
                                                        contentRef.current?.clientWidth ?? window.innerWidth,
                                                    ),
                                            ),
                                        )
                                    }
                                    onResizeEnd={persistReviewPaneWidth}
                                />
                            ) : null}
                            <div className={styles.reviewBody}>
                                <Suspense fallback={<Spinner size='lg' label='Loading review' />}>
                                    <SessionCodeView
                                        sessionId={session.id}
                                        onHasFilesChange={onHasFilesChange}
                                        keybindsEnabled={reviewPaneVisible}
                                    />
                                </Suspense>
                            </div>
                        </div>
                    ) : null}
                </div>
                {shellVisited ? (
                    <div
                        className={
                            isDesktop
                                ? showDesktopShell
                                    ? styles.shellPanelDesktop
                                    : styles.shellPanelDesktopHidden
                                : tab === 'terminal'
                                  ? styles.shellPanelMobile
                                  : styles.shellPanelMobileHidden
                        }
                        style={isDesktop && showDesktopShell ? { height: `${shellPaneHeightPct}%` } : undefined}
                        aria-hidden={!shellPaneVisible}
                    >
                        {isDesktop && showDesktopShell ? (
                            <PanelResizeHandle
                                orientation='vertical'
                                edge='leading'
                                ariaLabel={intl.formatMessage(panelResizeHandleMessages.resizeShellPanel)}
                                onResize={(delta) =>
                                    setShellPaneHeightPctState((pct) =>
                                        clampShellPaneHeightPct(
                                            pct -
                                                deltaPxToPct(
                                                    delta,
                                                    mainRef.current?.clientHeight ?? window.innerHeight,
                                                ),
                                        ),
                                    )
                                }
                                onResizeEnd={persistShellPaneHeight}
                            />
                        ) : null}
                        <div className={styles.shellTerminalWrap}>
                            <div ref={shellTerminalRef} className={styles.shellTerminal} />
                        </div>
                    </div>
                ) : null}
            </div>
            {pasteOpen ? (
                <div
                    className={styles.pasteBackdrop}
                    role='presentation'
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            closePasteSheet();
                        }
                    }}
                >
                    <div
                        className={styles.pastePanel}
                        role='dialog'
                        aria-modal='true'
                        aria-label={intl.formatMessage(messages.pasteSheetTitle)}
                    >
                        <p className={styles.pasteTitle}>{intl.formatMessage(messages.pasteSheetTitle)}</p>
                        <p className={styles.pasteHint}>{intl.formatMessage(messages.pasteSheetHint)}</p>
                        <textarea
                            ref={pasteInputRef}
                            className={styles.pasteInput}
                            rows={4}
                            autoCapitalize='off'
                            autoCorrect='off'
                            spellCheck={false}
                            enterKeyHint='done'
                            onPaste={onPasteSheetPaste}
                        />
                        <div className={styles.pasteActions}>
                            <Button type='button' onClick={submitPasteSheet}>
                                {intl.formatMessage(messages.pasteSheetInsert)}
                            </Button>
                            <Button type='button' variant='secondary' onClick={closePasteSheet}>
                                {intl.formatMessage(messages.pasteSheetCancel)}
                            </Button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
