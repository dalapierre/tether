import { Button } from '@client/components/button';
import { IconButton } from '@client/components/icon-button';
import { Panel } from '@client/components/panel';
import { PanelResizeHandle, panelResizeHandleMessages } from '@client/components/panel-resize-handle';
import { SegmentedControl } from '@client/components/segmented-control';
import { agentLabelMessage, type AgentId } from '@client/libs/agents/agents';
import { getRepository } from '@client/libs/api/repositories';
import {
    connectSessionShell,
    connectSessionTerminal,
    getSession,
    killSessionShell,
    sendTerminalMessage,
    type ServerTerminalMessage,
    type Session,
    type SessionStatus,
} from '@client/libs/api/sessions';
import { bindSessionViewport } from '@client/libs/dom/bindSessionViewport';
import { useIsDesktop } from '@client/libs/dom/useMediaQuery';
import { isTerminalInsertTarget, useKeybind, useKeybindChord, useKeybinds } from '@client/libs/keybinds';
import {
    getPanelResizeDragEpoch,
    isPanelResizeDragging,
    onPanelResizeDragEnd,
    onPanelResizeDragStart,
} from '@client/libs/layout/panelResizeDrag';
import {
    clampReviewPaneWidthPct,
    clampShellPaneHeightPct,
    deltaPxToPct,
    getReviewPaneWidthPct,
    getReviewPanelFullscreen,
    getReviewPanelOpen,
    getSelectedDiffPath,
    getShellPaneHeightPct,
    getShellPanelFullscreen,
    getShellPanelOpen,
    setReviewPanelFullscreen,
    setReviewPanelOpen,
    setReviewPaneWidthPct,
    setShellPaneHeightPct,
    setShellPanelFullscreen,
    setShellPanelOpen,
} from '@client/libs/layout/reviewLayoutPreferences';
import { clearPtyResize, flushPtyResize, schedulePtyResize } from '@client/libs/terminal/ptyResize';
import { scrollTerminalToBottomNow, writeTerminalHistory } from '@client/libs/terminal/scroll';
import { attachTouchScroll } from '@client/libs/terminal/touchScroll';
import { AURA_TERMINAL_THEME } from '@client/libs/theme/aura';
import { Spinner } from '@client/components/spinner';
import {
    ensureSessionDiff,
    getDiffGeneration,
    getLiveSession,
    getSessionsSnapshot,
    subscribe,
} from '@client/modules/session-events';
import { showToast } from '@client/modules/toast';
import { FitAddon } from '@xterm/addon-fit';
import { Terminal } from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';
import {
    Suspense,
    lazy,
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
    useSyncExternalStore,
    type ClipboardEvent,
} from 'react';
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

function BackIcon() {
    return (
        <svg
            className={styles.actionIcon}
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            aria-hidden='true'
        >
            <path strokeLinecap='round' strokeLinejoin='round' d='M15.75 19.5 8.25 12l7.5-7.5' />
        </svg>
    );
}

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

function CloseShellIcon() {
    return (
        <svg
            className={styles.shellToolbarIcon}
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

function FullscreenShellIcon() {
    return (
        <svg
            className={styles.shellToolbarIcon}
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='1.75'
            aria-hidden='true'
        >
            <path
                strokeLinecap='round'
                strokeLinejoin='round'
                d='M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15'
            />
        </svg>
    );
}

function ExitFullscreenShellIcon() {
    return (
        <svg
            className={styles.shellToolbarIcon}
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='1.75'
            aria-hidden='true'
        >
            <path
                strokeLinecap='round'
                strokeLinejoin='round'
                d='M9 9V4.5M9 9H4.5M9 9 3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5 5.25 5.25'
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

function usageClassName(percent: number): string {
    if (percent > 60) return styles.metaUsageDanger;
    if (percent >= 30) return styles.metaUsageWarning;
    return styles.metaUsage;
}

function harnessLabel(agent: AgentId, formatMessage: ReturnType<typeof useIntl>['formatMessage']): string {
    return formatMessage(agentLabelMessage(agent));
}

function sessionStatusLabelFor(
    connection: ConnectionState,
    status: SessionStatus,
    formatMessage: ReturnType<typeof useIntl>['formatMessage'],
): string {
    if (connection === 'connecting') {
        return formatMessage(messages.connecting);
    }
    if (connection === 'disconnected') {
        return formatMessage(messages.disconnected);
    }
    switch (status) {
        case 'ready':
            return formatMessage(messages.statusReady);
        case 'busy':
            return formatMessage(messages.statusBusy);
        case 'error':
            return formatMessage(messages.statusError);
    }
}

function sessionStatusDotClassFor(connection: ConnectionState, status: SessionStatus): string {
    if (connection === 'connecting') {
        return styles.statusDotConnecting;
    }
    if (connection === 'disconnected') {
        return styles.statusDotDisconnected;
    }
    switch (status) {
        case 'ready':
            return styles.statusDotReady;
        case 'busy':
            return styles.statusDotBusy;
        case 'error':
            return styles.statusDotError;
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

function isTerminalFocused(term: Terminal): boolean {
    return Boolean(term.textarea) && document.activeElement === term.textarea;
}

/** Keep the harness/shell prompt and painted cursor in view. */
function revealTerminalPrompt(term: Terminal): void {
    scrollTerminalToBottomNow(term);
    // Fit/background/keyboard resize can leave the cursor painted off the
    // real cell until the renderer redraws.
    term.refresh(0, Math.max(0, term.rows - 1));
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
            schedulePtyResize(term, socket, term.cols, term.rows);
        }
        if (refresh) {
            // Returning from a backgrounded tab can leave the cursor
            // painted at the wrong place until the renderer redraws.
            term.refresh(0, Math.max(0, term.rows - 1));
        }
        if (stickToBottom) {
            scrollTerminalToBottomNow(term);
        }
    } catch {
        // ignore fit errors while unmounted/hidden
    }
}

/**
 * One fit after a panel drag. Hide while reflowing if we're stuck to the bottom
 * so a large scrollback reflow doesn't paint a fast scrub through history.
 */
function syncTerminalLayoutAfterPanelResize(options: {
    host: HTMLElement | null;
    term: Terminal;
    fitAddon: FitAddon;
    socket?: WebSocket | null;
    /** When set, overrides the usual focused/at-bottom check (use drag-start intent). */
    followOutput?: boolean;
}): void {
    const { host, term, fitAddon, socket } = options;
    const followOutput = options.followOutput ?? (isTerminalFocused(term) || isScrolledToBottom(term));
    const element = followOutput ? term.element : null;
    if (element) {
        element.style.visibility = 'hidden';
    }
    try {
        syncTerminalLayout({
            host,
            term,
            fitAddon,
            socket,
            refresh: true,
            followOutput,
        });
        flushPtyResize(term);
        if (followOutput) {
            // Fit/SIGWINCH can leave the viewport at y=0 until the next frame.
            scrollTerminalToBottomNow(term);
            requestAnimationFrame(() => {
                scrollTerminalToBottomNow(term);
                term.refresh(0, Math.max(0, term.rows - 1));
            });
        }
    } finally {
        if (element) {
            element.style.visibility = '';
        }
    }
}

/** Skip layout syncs scheduled before a splitter drag ended (stale rAFs). */
function shouldSkipTerminalLayoutSync(scheduledEpoch: number): boolean {
    return isPanelResizeDragging() || scheduledEpoch !== getPanelResizeDragEpoch();
}

export function SessionView({ sessionId }: SessionViewProps) {
    const intl = useIntl();
    const navigate = useNavigate();
    const isDesktop = useIsDesktop();
    const [session, setSession] = useState<Session | null>(null);
    const liveSessions = useSyncExternalStore(subscribe, getSessionsSnapshot, getSessionsSnapshot);
    const diffGeneration = useSyncExternalStore(
        subscribe,
        () => getDiffGeneration(sessionId),
        () => getDiffGeneration(sessionId),
    );
    const displaySession = useMemo(() => {
        const live = liveSessions.get(sessionId) ?? getLiveSession(sessionId);
        if (live) return live;
        return session;
    }, [session, liveSessions, sessionId]);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [connection, setConnection] = useState<ConnectionState>('connecting');
    const [tab, setTab] = useState<SessionTab>('agent');
    const [reviewVisited, setReviewVisited] = useState(false);
    const [shellVisited, setShellVisited] = useState(false);
    const [desktopReviewOpen, setDesktopReviewOpen] = useState(false);
    const [desktopReviewFullscreen, setDesktopReviewFullscreen] = useState(false);
    const [desktopShellOpen, setDesktopShellOpen] = useState(false);
    const [desktopShellFullscreen, setDesktopShellFullscreen] = useState(false);
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
    // Tracks the last diff generation observed while this session view is mounted,
    // so we can detect a newly triggered diff (WS bump) vs the initial fetch.
    const seenDiffGenerationRef = useRef<number | null>(null);
    const showDesktopReview = isDesktop && desktopReviewOpen;
    const showDesktopReviewFullscreen = showDesktopReview && desktopReviewFullscreen;
    const showDesktopShell = isDesktop && desktopShellOpen;
    const showDesktopShellFullscreen = showDesktopShell && desktopShellFullscreen;
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

    // Remember follow intent at drag start — by pointer-up the terminal has
    // blurred into the handle, so an at-end check misses "was at the prompt".
    const shellFollowAfterResizeRef = useRef(true);

    useEffect(() => {
        return onPanelResizeDragStart(() => {
            const shellTerm = shellTermRef.current;
            shellFollowAfterResizeRef.current = shellTerm
                ? isTerminalFocused(shellTerm) || isScrolledToBottom(shellTerm)
                : true;
        });
    }, []);

    // Fit terminals once after any splitter drag (including the sessions panel).
    // Mid-drag fits reflow scrollback and scrub/jump history.
    useEffect(() => {
        return onPanelResizeDragEnd(() => {
            const shellFollow = shellFollowAfterResizeRef.current;
            requestAnimationFrame(() => {
                const agentTerm = termRef.current;
                const agentFit = fitAddonRef.current;
                if (agentTerm && agentFit) {
                    syncTerminalLayoutAfterPanelResize({
                        host: terminalRef.current,
                        term: agentTerm,
                        fitAddon: agentFit,
                        socket: socketRef.current,
                        // Agent pane is an input surface: always keep the prompt
                        // in view after the viewport shrinks (fit can land at y=0).
                        followOutput: true,
                    });
                }
                const shellTerm = shellTermRef.current;
                const shellFit = shellFitAddonRef.current;
                if (shellTerm && shellFit) {
                    syncTerminalLayoutAfterPanelResize({
                        host: shellTerminalRef.current,
                        term: shellTerm,
                        fitAddon: shellFit,
                        socket: shellSocketRef.current,
                        followOutput: shellFollow,
                    });
                }
            });
        });
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

    function enterDesktopReviewFullscreen() {
        setDesktopReviewFullscreen(true);
        setReviewPanelFullscreen(sessionId, true);
        setDesktopReviewOpen(true);
        setReviewPanelOpen(sessionId, true);
        setReviewVisited(true);
        // Shell and review fullscreen both claim the main area.
        if (desktopShellFullscreen) {
            setDesktopShellFullscreen(false);
            setShellPanelFullscreen(sessionId, false);
        }
    }

    function toggleDesktopReviewFullscreen() {
        // Only exit when review is already open and fullscreen; otherwise set
        // fullscreen (and open the panel if needed). Closing via `.` leaves the
        // fullscreen preference sticky for the next open.
        if (desktopReviewOpen && desktopReviewFullscreen) {
            setDesktopReviewFullscreen(false);
            setReviewPanelFullscreen(sessionId, false);
            return;
        }
        enterDesktopReviewFullscreen();
    }

    function enterDesktopShellFullscreen() {
        setDesktopShellFullscreen(true);
        setShellPanelFullscreen(sessionId, true);
        setDesktopShellOpen(true);
        setShellPanelOpen(sessionId, true);
        setShellVisited(true);
        if (desktopReviewFullscreen) {
            setDesktopReviewFullscreen(false);
            setReviewPanelFullscreen(sessionId, false);
        }
    }

    function toggleDesktopShellFullscreen() {
        // Sticky like review: closing the shell leaves the fullscreen preference
        // for the next open; this control only exits when already fullscreen.
        if (desktopShellOpen && desktopShellFullscreen) {
            setDesktopShellFullscreen(false);
            setShellPanelFullscreen(sessionId, false);
            return;
        }
        enterDesktopShellFullscreen();
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

    /** Hide the shell pane and kill its PTY (agent terminal is untouched). */
    function closeShell() {
        if (isDesktop) {
            setDesktopShellOpen(false);
            setShellPanelOpen(sessionId, false);
        } else {
            setTab('agent');
        }
        setShellVisited(false);

        void killSessionShell(sessionId).catch((err: unknown) => {
            showToast('generic-error', err instanceof Error ? err.message : intl.formatMessage(messages.loadFailed));
        });
    }

    const goBack = useCallback(() => {
        navigate('/', { replace: true });
    }, [navigate]);

    useKeybind('session', 'goBack', goBack, { enabled: sessionReady });
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
    useKeybind(
        'session',
        'reviewFullscreen',
        () => {
            if (session?.type !== 'coding') return;
            if (!isDesktop) {
                setReviewVisited(true);
                setTab('review');
                return;
            }
            toggleDesktopReviewFullscreen();
        },
        { enabled: sessionReady },
    );
    useKeybind('session', 'toggleTerminal', () => toggleShell(), {
        enabled: sessionReady,
        allowInTerminalInsert: true,
    });
    const { keybinds } = useKeybinds();
    const enterInsertChord = keybinds.session.enterAgentInsert;
    const exitInsertChord = keybinds.session.exitAgentInsert;
    const insertUsesSameChord = enterInsertChord.trim() === exitInsertChord.trim();

    useKeybindChord(
        enterInsertChord,
        () => {
            const term = termRef.current;
            const insertActive = Boolean(term?.textarea) && document.activeElement === term?.textarea;

            if (insertActive) {
                // Same chord for enter/exit — toggle out.
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
        setDesktopReviewFullscreen(getReviewPanelFullscreen(sessionId));
        setReviewVisited(storedOpen === true);
        seenDiffGenerationRef.current = null;

        const storedShellOpen = getShellPanelOpen(sessionId);
        setDesktopShellOpen(storedShellOpen === true);
        setDesktopShellFullscreen(getShellPanelFullscreen(sessionId));
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

        // Stick to the live prompt after the user focuses/types, even if a write
        // started while they were scrolled up in history.
        let followOutput = isScrolledToBottom(term);

        const scrollToBottomAndFollow = () => {
            followOutput = true;
            scrollTerminalToBottomNow(term);
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

        // Entering insert mode (tap / keybind) must reveal the harness input
        // before the first keystroke — otherwise typed text stays off-screen.
        let focusSettleTimers: number[] = [];
        const onTerminalFocus = () => {
            followOutput = true;
            revealTerminalPrompt(term);
            for (const timer of focusSettleTimers) {
                window.clearTimeout(timer);
            }
            // Soft keyboard / visualViewport can settle after focus; re-stick.
            focusSettleTimers = [50, 300].map((delay) =>
                window.setTimeout(() => {
                    if (!isTerminalFocused(term)) return;
                    followOutput = true;
                    syncTerminalLayout({
                        host: terminalRef.current,
                        term,
                        fitAddon,
                        socket,
                        refresh: true,
                        followOutput: true,
                    });
                }, delay),
            );
        };
        term.textarea?.addEventListener('focus', onTerminalFocus);

        const onResize = () => {
            // Wait a frame so bindSessionViewport has applied visualViewport layout.
            const scheduledEpoch = getPanelResizeDragEpoch();
            requestAnimationFrame(() => {
                // Panel drags update layout every pointer move; fitting each
                // time reflows scrollback and paints a fast scrub through history.
                // Also skip stale rAFs scheduled during a drag that just ended.
                if (shouldSkipTerminalLayoutSync(scheduledEpoch)) return;
                if (isTerminalFocused(term)) {
                    followOutput = true;
                }
                syncTerminalLayout({
                    host: terminalRef.current,
                    term,
                    fitAddon,
                    socket,
                    refresh: isTerminalFocused(term),
                    followOutput,
                });
            });
        };

        const onVisibilityOrFocus = () => {
            if (document.visibilityState === 'hidden') return;
            // Wait for layout to settle after the browser restores the tab.
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    if (isTerminalFocused(term)) {
                        followOutput = true;
                    }
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
                const isHistory = parsed.type === 'history';
                if (isHistory) {
                    // Large history parses across frames while the viewport
                    // follows the bottom — hide until done so we land instantly.
                    writeTerminalHistory(term, parsed.data, () => {
                        followOutput = true;
                        requestAnimationFrame(() => {
                            syncTerminalLayout({
                                host: terminalRef.current,
                                term,
                                fitAddon,
                                socket,
                                refresh: true,
                                followOutput: true,
                            });
                        });
                    });
                    return;
                }
                const stickToBottom = followOutput;
                term.write(parsed.data, () => {
                    if (!stickToBottom && !followOutput) return;
                    scrollTerminalToBottomNow(term);
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
            term.textarea?.removeEventListener('focus', onTerminalFocus);
            for (const timer of focusSettleTimers) {
                window.clearTimeout(timer);
            }
            dataDisposable.dispose();
            scrollDisposable.dispose();
            clearPtyResize(term);
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
            scrollTerminalToBottomNow(term);
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

        let focusSettleTimers: number[] = [];
        const onTerminalFocus = () => {
            followOutput = true;
            revealTerminalPrompt(term);
            for (const timer of focusSettleTimers) {
                window.clearTimeout(timer);
            }
            focusSettleTimers = [50, 300].map((delay) =>
                window.setTimeout(() => {
                    if (!isTerminalFocused(term)) return;
                    followOutput = true;
                    syncTerminalLayout({
                        host: shellTerminalRef.current,
                        term,
                        fitAddon,
                        socket,
                        refresh: true,
                        followOutput: true,
                    });
                }, delay),
            );
        };
        term.textarea?.addEventListener('focus', onTerminalFocus);

        const onResize = () => {
            const scheduledEpoch = getPanelResizeDragEpoch();
            requestAnimationFrame(() => {
                if (shouldSkipTerminalLayoutSync(scheduledEpoch)) return;
                if (isTerminalFocused(term)) {
                    followOutput = true;
                }
                syncTerminalLayout({
                    host: shellTerminalRef.current,
                    term,
                    fitAddon,
                    socket,
                    refresh: isTerminalFocused(term),
                    followOutput,
                });
            });
        };

        const onVisibilityOrFocus = () => {
            if (document.visibilityState === 'hidden') return;
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    if (isTerminalFocused(term)) {
                        followOutput = true;
                    }
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
                const isHistory = parsed.type === 'history';
                if (isHistory) {
                    writeTerminalHistory(term, parsed.data, () => {
                        followOutput = true;
                        requestAnimationFrame(() => {
                            syncTerminalLayout({
                                host: shellTerminalRef.current,
                                term,
                                fitAddon,
                                socket,
                                refresh: true,
                                followOutput: true,
                            });
                        });
                    });
                    return;
                }
                const stickToBottom = followOutput;
                term.write(parsed.data, () => {
                    if (!stickToBottom && !followOutput) return;
                    scrollTerminalToBottomNow(term);
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
            term.textarea?.removeEventListener('focus', onTerminalFocus);
            for (const timer of focusSettleTimers) {
                window.clearTimeout(timer);
            }
            dataDisposable.dispose();
            scrollDisposable.dispose();
            clearPtyResize(term);
            socket.close();
            shellSocketRef.current = null;
            term.dispose();
            shellTermRef.current = null;
            shellFitAddonRef.current = null;
        };
    }, [loading, failed, session, intl, shellVisited]);

    function focusTerminal() {
        const term = termRef.current;
        if (!term) return;
        revealTerminalPrompt(term);
        term.focus();
    }

    function focusShellTerminal() {
        const term = shellTermRef.current;
        if (!term) return;
        revealTerminalPrompt(term);
        term.focus();
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

    function submitAgentPrompt(text: string) {
        const trimmed = text.trim();
        if (!trimmed) return;
        const socket = socketRef.current;
        if (!socket || socket.readyState !== WebSocket.OPEN) return;
        sendTerminalMessage(socket, { type: 'message', text: trimmed });
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
            return;
        }

        let cancelled = false;
        const generation = diffGeneration;
        const previousGeneration = seenDiffGenerationRef.current;
        const isNewDiff = previousGeneration !== null && generation > previousGeneration;
        seenDiffGenerationRef.current = generation;

        ensureSessionDiff(session.id, generation)
            .then((state) => {
                if (cancelled) return;
                // Cold/pending empty responses should not clear a previously known review tab.
                if (state.pending && (!state.summary || state.summary.files.length === 0)) {
                    return;
                }
                const hasFiles = (state.summary?.files.length ?? 0) > 0;
                if (!hasFiles) {
                    return;
                }

                setReviewVisited(true);

                const storedOpen = getReviewPanelOpen(sessionId);
                // Open on first preference (never set), or whenever a new diff is triggered
                // while this session is open — even if the user previously closed the panel.
                if (storedOpen === null || isNewDiff) {
                    setDesktopReviewOpen(true);
                    setReviewPanelOpen(sessionId, true);
                    if (!isDesktop) {
                        setTab('review');
                    }
                    return;
                }

                // Return to the review tab when a file was open before refresh (mobile).
                if (!isDesktop && getSelectedDiffPath(sessionId)) {
                    setTab('review');
                }
            })
            .catch(() => {
                // Keep the last known state; tab enablement is best-effort.
            });

        return () => {
            cancelled = true;
        };
    }, [session, diffGeneration, sessionId, isDesktop]);

    useEffect(() => {
        if (!isDesktop && tab !== 'agent') return;
        const fitAddon = fitAddonRef.current;
        const term = termRef.current;
        if (!fitAddon || !term) return;

        // Width/height pct updates fire continuously while dragging; the
        // resize-end handler fits once. Skip mid-drag and stale post-drag rAFs.
        const scheduledEpoch = getPanelResizeDragEpoch();
        requestAnimationFrame(() => {
            if (shouldSkipTerminalLayoutSync(scheduledEpoch)) return;
            const followOutput = isTerminalFocused(term) || isScrolledToBottom(term);
            syncTerminalLayout({
                host: terminalRef.current,
                term,
                fitAddon,
                socket: socketRef.current,
                refresh: true,
                followOutput,
            });
        });
    }, [
        tab,
        isDesktop,
        showDesktopReview,
        showDesktopReviewFullscreen,
        showDesktopShell,
        showDesktopShellFullscreen,
        reviewPaneWidthPct,
        shellPaneHeightPct,
    ]);

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

        const scheduledEpoch = getPanelResizeDragEpoch();
        requestAnimationFrame(() => {
            if (shouldSkipTerminalLayoutSync(scheduledEpoch)) return;
            const followOutput = isTerminalFocused(term) || isScrolledToBottom(term);
            syncTerminalLayout({
                host: shellTerminalRef.current,
                term,
                fitAddon,
                socket: shellSocketRef.current,
                refresh: true,
                followOutput,
            });
            if (becameVisible) {
                term.focus();
            }
        });
    }, [
        tab,
        isDesktop,
        desktopShellOpen,
        shellVisited,
        shellPaneVisible,
        shellPaneHeightPct,
        showDesktopReview,
        showDesktopShellFullscreen,
    ]);

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

    const backButton = (
        <div className={styles.mobileBack}>
            <IconButton label={intl.formatMessage(messages.goBack)} onClick={goBack}>
                <BackIcon />
            </IconButton>
        </div>
    );

    if (loading) {
        return (
            <div ref={rootRef} className={styles.root}>
                <Panel className={styles.headerPanel}>
                    <div className={styles.header}>
                        <div className={styles.headerStart}>
                            {backButton}
                            <h1 className={styles.headerTitle}>{intl.formatMessage(messages.loadingCrumb)}</h1>
                        </div>
                    </div>
                </Panel>
                <p className={styles.centered}>{intl.formatMessage(messages.loading)}</p>
            </div>
        );
    }

    if (failed || !session || !displaySession) {
        return (
            <div ref={rootRef} className={styles.root}>
                <Panel className={styles.headerPanel}>
                    <div className={styles.header}>
                        <div className={styles.headerStart}>
                            {backButton}
                            <h1 className={styles.headerTitle}>{intl.formatMessage(messages.notFound)}</h1>
                        </div>
                    </div>
                </Panel>
                <p className={styles.centered}>{intl.formatMessage(messages.notFound)}</p>
            </div>
        );
    }

    const statusLabel = sessionStatusLabelFor(connection, displaySession.status, intl.formatMessage);
    const statusDotClass = sessionStatusDotClassFor(connection, displaySession.status);
    const agentTitle = harnessLabel(displaySession.agent, intl.formatMessage);
    const terminalToggleLabel = intl.formatMessage(messages.toggleTerminal);
    const reviewToggleLabel = intl.formatMessage(desktopReviewOpen ? messages.closeReview : messages.openReview);

    return (
        <div ref={rootRef} className={styles.root}>
            <Panel className={styles.headerPanel}>
                <div className={styles.header}>
                    <div className={styles.headerStart}>
                        {backButton}
                        <h1 className={styles.headerTitle}>{session.name}</h1>
                    </div>
                    <div className={styles.headerActions}>
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
                    </div>
                </div>
            </Panel>
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
                            { value: 'agent', label: agentTitle },
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
            <Panel className={styles.metaPanel}>
                <div className={styles.meta}>
                    <p className={styles.metaText}>
                        {displaySession.type === 'coding' ? (
                            <>
                                <span className={styles.metaRepo}>{repositoryName ?? displaySession.repositoryId}</span>
                                {' > '}
                                {displaySession.branch}
                                {displaySession.behindDefault != null &&
                                displaySession.behindDefault > 0 &&
                                displaySession.defaultBranch ? (
                                    <>
                                        {' · '}
                                        <span
                                            className={
                                                displaySession.behindDefault >= 20
                                                    ? styles.metaBehindDanger
                                                    : styles.metaBehindWarning
                                            }
                                        >
                                            {intl.formatMessage(messages.branchBehindDefault, {
                                                count: displaySession.behindDefault,
                                                defaultBranch: displaySession.defaultBranch,
                                            })}
                                        </span>
                                    </>
                                ) : null}
                            </>
                        ) : (
                            intl.formatMessage(messages.metaConversation, {
                                harness: harnessLabel(displaySession.agent, intl.formatMessage),
                            })
                        )}
                    </p>
                    {!isDesktop && (displaySession.cpuPercent != null || displaySession.ramPercent != null) ? (
                        <p className={styles.metaUsageGroup}>
                            {displaySession.cpuPercent != null ? (
                                <span className={usageClassName(displaySession.cpuPercent)}>
                                    {intl.formatMessage(messages.metaCpu, {
                                        percent: displaySession.cpuPercent,
                                    })}
                                </span>
                            ) : null}
                            {displaySession.ramPercent != null ? (
                                <span className={usageClassName(displaySession.ramPercent)}>
                                    {intl.formatMessage(messages.metaRam, {
                                        percent: displaySession.ramPercent,
                                    })}
                                </span>
                            ) : null}
                        </p>
                    ) : null}
                </div>
            </Panel>
            <div ref={mainRef} className={styles.main}>
                <div
                    ref={contentRef}
                    className={showDesktopShellFullscreen ? styles.contentShellFullscreenHidden : styles.content}
                    aria-hidden={showDesktopShellFullscreen}
                    style={
                        showDesktopShellFullscreen
                            ? undefined
                            : isDesktop && showDesktopReview && !showDesktopReviewFullscreen && reviewVisited
                              ? { gridTemplateColumns: `minmax(0, 1fr) auto ${reviewPaneWidthPct}%` }
                              : isDesktop
                                ? { gridTemplateColumns: 'minmax(0, 1fr)' }
                                : undefined
                    }
                >
                    <Panel
                        className={
                            showDesktopShellFullscreen || showDesktopReviewFullscreen
                                ? styles.paneInactive
                                : isDesktop || tab === 'agent'
                                  ? styles.pane
                                  : styles.paneInactive
                        }
                        aria-hidden={
                            showDesktopShellFullscreen || showDesktopReviewFullscreen || (!isDesktop && tab !== 'agent')
                        }
                        title={
                            <>
                                <span className={styles.agentTitleName}>{agentTitle}</span>
                                <span
                                    className={`${styles.statusDot} ${statusDotClass}`}
                                    role='status'
                                    aria-label={statusLabel}
                                />
                            </>
                        }
                        toolbarActions={
                            <div className={styles.paneToolbarActions}>
                                <button
                                    type='button'
                                    className={styles.paneToggle}
                                    title={terminalToggleLabel}
                                    aria-label={terminalToggleLabel}
                                    aria-pressed={shellPaneVisible}
                                    onClick={toggleShell}
                                >
                                    <TerminalIcon className={styles.paneToggleIcon} />
                                </button>
                                {session.type === 'coding' ? (
                                    <button
                                        type='button'
                                        className={styles.paneToggle}
                                        title={reviewToggleLabel}
                                        aria-label={reviewToggleLabel}
                                        aria-pressed={desktopReviewOpen}
                                        onClick={toggleDesktopReview}
                                    >
                                        <ReviewIcon className={styles.paneToggleIcon} />
                                    </button>
                                ) : null}
                            </div>
                        }
                    >
                        <div className={styles.terminalWrap}>
                            <div ref={terminalRef} className={styles.terminal} />
                        </div>
                    </Panel>
                    {isDesktop && showDesktopReview && !showDesktopReviewFullscreen && reviewVisited ? (
                        <PanelResizeHandle
                            placement='gap'
                            ariaLabel={intl.formatMessage(panelResizeHandleMessages.resizeReviewPanel)}
                            onResize={(delta) =>
                                setReviewPaneWidthPctState((pct) =>
                                    clampReviewPaneWidthPct(
                                        pct - deltaPxToPct(delta, contentRef.current?.clientWidth ?? window.innerWidth),
                                    ),
                                )
                            }
                            onResizeEnd={persistReviewPaneWidth}
                        />
                    ) : null}
                    {session.type === 'coding' && reviewVisited ? (
                        <Panel
                            ref={reviewPaneRef}
                            className={
                                showDesktopShellFullscreen || !reviewPaneVisible
                                    ? styles.paneInactive
                                    : showDesktopReviewFullscreen
                                      ? styles.paneReviewFullscreen
                                      : styles.paneReview
                            }
                            aria-hidden={showDesktopShellFullscreen || !reviewPaneVisible}
                        >
                            <div className={styles.reviewBody}>
                                <Suspense fallback={<Spinner size='lg' label='Loading review' />}>
                                    <SessionCodeView
                                        sessionId={session.id}
                                        keybindsEnabled={reviewPaneVisible}
                                        onSubmitAgentPrompt={submitAgentPrompt}
                                        fullscreen={showDesktopReviewFullscreen}
                                        onToggleFullscreen={isDesktop ? toggleDesktopReviewFullscreen : undefined}
                                    />
                                </Suspense>
                            </div>
                        </Panel>
                    ) : null}
                </div>
                {isDesktop && showDesktopShell && !showDesktopShellFullscreen && shellVisited ? (
                    <PanelResizeHandle
                        placement='gap'
                        orientation='vertical'
                        ariaLabel={intl.formatMessage(panelResizeHandleMessages.resizeShellPanel)}
                        onResize={(delta) =>
                            setShellPaneHeightPctState((pct) =>
                                clampShellPaneHeightPct(
                                    pct - deltaPxToPct(delta, mainRef.current?.clientHeight ?? window.innerHeight),
                                ),
                            )
                        }
                        onResizeEnd={persistShellPaneHeight}
                    />
                ) : null}
                {shellVisited ? (
                    <Panel
                        className={
                            isDesktop
                                ? showDesktopShell
                                    ? showDesktopShellFullscreen
                                        ? styles.shellPanelDesktopFullscreen
                                        : styles.shellPanelDesktop
                                    : styles.shellPanelDesktopHidden
                                : tab === 'terminal'
                                  ? styles.shellPanelMobile
                                  : styles.shellPanelMobileHidden
                        }
                        style={
                            isDesktop && showDesktopShell && !showDesktopShellFullscreen
                                ? { height: `${shellPaneHeightPct}%` }
                                : undefined
                        }
                        aria-hidden={!shellPaneVisible}
                        title={intl.formatMessage(messages.terminalView)}
                        toolbarClassName='relative z-10'
                        toolbarActions={
                            <div className={styles.shellToolbarActions}>
                                {isDesktop ? (
                                    <button
                                        type='button'
                                        className={`${styles.shellToolbarButton}${
                                            showDesktopShellFullscreen ? ` ${styles.shellToolbarButtonActive}` : ''
                                        }`}
                                        title={intl.formatMessage(
                                            showDesktopShellFullscreen
                                                ? messages.exitFullscreenTerminal
                                                : messages.enterFullscreenTerminal,
                                        )}
                                        aria-label={intl.formatMessage(
                                            showDesktopShellFullscreen
                                                ? messages.exitFullscreenTerminal
                                                : messages.enterFullscreenTerminal,
                                        )}
                                        aria-pressed={showDesktopShellFullscreen}
                                        onClick={toggleDesktopShellFullscreen}
                                    >
                                        {showDesktopShellFullscreen ? (
                                            <ExitFullscreenShellIcon />
                                        ) : (
                                            <FullscreenShellIcon />
                                        )}
                                    </button>
                                ) : null}
                                <button
                                    type='button'
                                    className={styles.shellToolbarButton}
                                    title={intl.formatMessage(messages.closeTerminal)}
                                    aria-label={intl.formatMessage(messages.closeTerminal)}
                                    onClick={closeShell}
                                >
                                    <CloseShellIcon />
                                </button>
                            </div>
                        }
                    >
                        <div className={styles.shellTerminalWrap}>
                            <div ref={shellTerminalRef} className={styles.shellTerminal} />
                        </div>
                    </Panel>
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
