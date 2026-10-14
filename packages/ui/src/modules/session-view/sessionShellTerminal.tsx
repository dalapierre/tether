import { sendTerminalMessage, type ServerShellMessage } from '@ui/libs/api/sessions';
import { getPanelResizeDragEpoch, isPanelResizeDragging } from '@ui/libs/layout/panelResizeDrag';
import { createLastCommandTracker } from '@ui/libs/terminal/lastCommandTracker';
import { clearPtyResize, flushPtyResize, schedulePtyResize } from '@ui/libs/terminal/ptyResize';
import { resumeXtermRenderer, resumeXtermRendererIfNeeded } from '@ui/libs/terminal/resumeRenderer';
import { scrollTerminalToBottomNow, writeTerminalHistory } from '@ui/libs/terminal/scroll';
import { readTerminalSelectionExplain, type TerminalSelectionExplain } from '@ui/libs/terminal/selectionExplain';
import { attachTouchScroll } from '@ui/libs/terminal/touchScroll';
import { AURA_TERMINAL_THEME } from '@ui/libs/theme/aura';
import { messages as shellMessages } from '@ui/modules/shell-split-panel/shellSplitPanel.messages';
import { styles } from '@ui/modules/shell-split-panel/shellSplitPanel.styles';
import { showToast } from '@ui/modules/toast';
import { FitAddon } from '@xterm/addon-fit';
import { Terminal } from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { messages } from './sessionView.messages';

/** Keep in sync with server PTY resize clamp in sessions/store.ts */
const MAX_TERMINAL_COLS = 300;

export type SessionShellTerminalHandle = {
    focus: () => void;
    blur: () => void;
    fit: (options?: { followOutput?: boolean; afterPanelResize?: boolean }) => void;
    isFocused: () => boolean;
    isFollowOutput: () => boolean;
};

export type SessionShellTerminalProps = {
    /** Open the WebSocket for this terminal instance. */
    connect: () => WebSocket;
    /** Remount key when the underlying shell identity changes. */
    shellKey: string;
    active: boolean;
    onTitle: (title: string) => void;
    onHandleChange: (handle: SessionShellTerminalHandle | null) => void;
    /**
     * Highlighted terminal text → explain.
     * `command` is the last locally submitted shell line when known.
     */
    onExplain?: (errorMessage: string, command: string) => void;
    /**
     * Workspace Explain: after connect, run the default harness CLI in this pane
     * with this prompt (no Tether session).
     */
    harnessPrompt?: string;
    onHarnessPromptConsumed?: () => void;
};

function prepareMobileTextarea(term: Terminal): void {
    const textarea = term.textarea;
    if (!textarea) return;
    textarea.setAttribute('inputmode', 'text');
    textarea.setAttribute('enterkeyhint', 'send');
    textarea.setAttribute('autocapitalize', 'off');
    textarea.setAttribute('autocomplete', 'off');
    textarea.setAttribute('autocorrect', 'off');
    textarea.setAttribute('spellcheck', 'false');
    textarea.scrollIntoView = () => {};
    const undoFocusScroll = () => {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
    };
    textarea.addEventListener('focus', () => {
        undoFocusScroll();
        requestAnimationFrame(undoFocusScroll);
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

function revealTerminalPrompt(term: Terminal): void {
    scrollTerminalToBottomNow(term);
    resumeXtermRenderer(term);
}

function shouldSkipTerminalLayoutSync(scheduledEpoch: number): boolean {
    return isPanelResizeDragging() || scheduledEpoch !== getPanelResizeDragEpoch();
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
        if (term.cols > MAX_TERMINAL_COLS) {
            term.resize(MAX_TERMINAL_COLS, term.rows);
        }
        if (socket && socket.readyState === WebSocket.OPEN) {
            schedulePtyResize(term, socket, term.cols, term.rows);
        }
        if (refresh) {
            resumeXtermRenderer(term);
        }
        if (stickToBottom) {
            scrollTerminalToBottomNow(term);
        }
    } catch {
        // ignore fit errors while unmounted/hidden
    }
}

function syncTerminalLayoutAfterPanelResize(options: {
    host: HTMLElement | null;
    term: Terminal;
    fitAddon: FitAddon;
    socket?: WebSocket | null;
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
            scrollTerminalToBottomNow(term);
            requestAnimationFrame(() => {
                scrollTerminalToBottomNow(term);
                resumeXtermRenderer(term);
            });
        }
    } finally {
        if (element) {
            element.style.visibility = '';
            resumeXtermRenderer(term);
        }
    }
}

export function SessionShellTerminal({
    connect,
    shellKey,
    active,
    onTitle,
    onHandleChange,
    onExplain,
    harnessPrompt,
    onHarnessPromptConsumed,
}: SessionShellTerminalProps) {
    const intl = useIntl();
    const hostRef = useRef<HTMLDivElement | null>(null);
    const paneRef = useRef<HTMLDivElement | null>(null);
    const termRef = useRef<Terminal | null>(null);
    const connectRef = useRef(connect);
    const onTitleRef = useRef(onTitle);
    const onHandleChangeRef = useRef(onHandleChange);
    const onExplainRef = useRef(onExplain);
    const harnessPromptRef = useRef(harnessPrompt);
    const onHarnessPromptConsumedRef = useRef(onHarnessPromptConsumed);
    const activeRef = useRef(active);
    const lastCommandRef = useRef(createLastCommandTracker());
    const [selectionExplain, setSelectionExplain] = useState<TerminalSelectionExplain | null>(null);

    connectRef.current = connect;
    onTitleRef.current = onTitle;
    onHandleChangeRef.current = onHandleChange;
    onExplainRef.current = onExplain;
    harnessPromptRef.current = harnessPrompt;
    onHarnessPromptConsumedRef.current = onHarnessPromptConsumed;
    activeRef.current = active;

    const syncSelectionExplain = useCallback(() => {
        const term = termRef.current;
        const pane = paneRef.current;
        if (!term || !pane || !onExplainRef.current) {
            setSelectionExplain(null);
            return;
        }

        const screen = term.element?.querySelector('.xterm-screen') as HTMLElement | null;
        if (!screen) {
            setSelectionExplain(null);
            return;
        }

        const paneRect = pane.getBoundingClientRect();
        const screenRect = screen.getBoundingClientRect();
        const next = readTerminalSelectionExplain({
            selection: term.getSelection(),
            position: term.getSelectionPosition() ?? undefined,
            viewportY: term.buffer.active.viewportY,
            cols: term.cols,
            rows: term.rows,
            screenWidth: screenRect.width,
            screenHeight: screenRect.height,
            screenOffsetLeft: screenRect.left - paneRect.left,
            screenOffsetTop: screenRect.top - paneRect.top,
            overlayWidth: paneRect.width,
            overlayHeight: paneRect.height,
        });
        setSelectionExplain(next);
    }, []);

    const handleExplainClick = useCallback(() => {
        const content = selectionExplain?.content;
        if (!content?.trim() || !onExplainRef.current) return;
        onExplainRef.current(content, lastCommandRef.current.getLastCommand());
        termRef.current?.clearSelection();
        setSelectionExplain(null);
    }, [selectionExplain]);

    useEffect(() => {
        const host = hostRef.current;
        if (!host) return;

        lastCommandRef.current = createLastCommandTracker();
        setSelectionExplain(null);

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
        term.open(host);
        fitAddon.fit();
        prepareMobileTextarea(term);
        termRef.current = term;

        let socket: WebSocket;
        try {
            socket = connectRef.current();
        } catch (err: unknown) {
            showToast('generic-error', err instanceof Error ? err.message : intl.formatMessage(messages.loadFailed));
            term.dispose();
            termRef.current = null;
            return;
        }

        let followOutput = isScrolledToBottom(term);

        const scrollToBottomAndFollow = () => {
            followOutput = true;
            scrollTerminalToBottomNow(term);
        };

        const sendInput = (data: string) => {
            lastCommandRef.current.pushInput(data);
            scrollToBottomAndFollow();
            resumeXtermRendererIfNeeded(term);
            if (socket.readyState !== WebSocket.OPEN) return;
            sendTerminalMessage(socket, { type: 'input', data });
        };

        const dataDisposable = term.onData(sendInput);
        const selectionDisposable = term.onSelectionChange(() => {
            syncSelectionExplain();
        });
        const scrollDisposable = term.onScroll(() => {
            followOutput = isScrolledToBottom(term);
            syncSelectionExplain();
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
                        host: hostRef.current,
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

        // When Explain opens this pane, hold resize until runHarness is sent so the
        // host starts the harness CLI PTY directly instead of a throwaway bash.
        let deferResizeForHarness = Boolean(harnessPromptRef.current?.trim());

        const onResize = () => {
            if (deferResizeForHarness) return;
            const scheduledEpoch = getPanelResizeDragEpoch();
            requestAnimationFrame(() => {
                if (deferResizeForHarness) return;
                if (shouldSkipTerminalLayoutSync(scheduledEpoch)) return;
                if (isTerminalFocused(term)) {
                    followOutput = true;
                }
                syncTerminalLayout({
                    host: hostRef.current,
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
                        host: hostRef.current,
                        term,
                        fitAddon,
                        socket,
                        refresh: true,
                        followOutput,
                    });
                });
            });
        };

        let harnessPromptSent = false;
        const onSocketOpen = () => {
            if (!harnessPromptSent) {
                const pending = harnessPromptRef.current?.trim();
                if (pending) {
                    harnessPromptSent = true;
                    sendTerminalMessage(socket, { type: 'runHarness', text: pending });
                    onHarnessPromptConsumedRef.current?.();
                }
                deferResizeForHarness = false;
            }
            onResize();
        };
        socket.addEventListener('open', onSocketOpen);
        if (socket.readyState === WebSocket.OPEN) {
            onSocketOpen();
        }

        socket.addEventListener('message', (event) => {
            let parsed: ServerShellMessage;
            try {
                parsed = JSON.parse(String(event.data)) as ServerShellMessage;
            } catch {
                return;
            }

            if (parsed.type === 'title') {
                onTitleRef.current(parsed.title);
                return;
            }

            if (parsed.type === 'history' || parsed.type === 'output') {
                const isHistory = parsed.type === 'history';
                if (isHistory) {
                    writeTerminalHistory(term, parsed.data, () => {
                        followOutput = true;
                        requestAnimationFrame(() => {
                            syncTerminalLayout({
                                host: hostRef.current,
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
                    resumeXtermRendererIfNeeded(term);
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
        observer.observe(host);
        const detachTouchScroll = attachTouchScroll(host, term);

        const handle: SessionShellTerminalHandle = {
            focus: () => {
                revealTerminalPrompt(term);
                term.focus();
            },
            blur: () => {
                term.blur();
            },
            fit: (options) => {
                const follow = options?.followOutput ?? (isTerminalFocused(term) || isScrolledToBottom(term));
                if (options?.afterPanelResize) {
                    syncTerminalLayoutAfterPanelResize({
                        host: hostRef.current,
                        term,
                        fitAddon,
                        socket,
                        followOutput: follow,
                    });
                    return;
                }
                syncTerminalLayout({
                    host: hostRef.current,
                    term,
                    fitAddon,
                    socket,
                    refresh: true,
                    followOutput: follow,
                });
            },
            isFocused: () => isTerminalFocused(term),
            isFollowOutput: () => isTerminalFocused(term) || isScrolledToBottom(term),
        };
        onHandleChangeRef.current(handle);

        if (activeRef.current) {
            requestAnimationFrame(() => {
                handle.focus();
            });
        }

        return () => {
            onHandleChangeRef.current(null);
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
            selectionDisposable.dispose();
            scrollDisposable.dispose();
            clearPtyResize(term);
            socket.close();
            term.dispose();
            termRef.current = null;
            setSelectionExplain(null);
        };
    }, [shellKey, intl, syncSelectionExplain]);

    return (
        <div ref={paneRef} className={styles.shellTerminalPane}>
            <div ref={hostRef} className={styles.shellTerminal} />
            {selectionExplain && onExplain ? (
                <button
                    type='button'
                    className={`${styles.explainButton}${
                        selectionExplain.placeAbove ? ` ${styles.explainButtonAbove}` : ''
                    }`}
                    style={{ top: selectionExplain.top, left: selectionExplain.left }}
                    onMouseDown={(event) => {
                        // Keep the xterm selection when clicking the overlay button.
                        event.preventDefault();
                    }}
                    onClick={handleExplainClick}
                >
                    {intl.formatMessage(shellMessages.explainSelection)}
                </button>
            ) : null}
        </div>
    );
}
