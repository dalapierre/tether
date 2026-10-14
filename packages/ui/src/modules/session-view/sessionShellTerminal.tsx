import { sendTerminalMessage, type ServerShellMessage } from '@ui/libs/api/sessions';
import { getPanelResizeDragEpoch, isPanelResizeDragging } from '@ui/libs/layout/panelResizeDrag';
import { clearPtyResize, flushPtyResize, schedulePtyResize } from '@ui/libs/terminal/ptyResize';
import { resumeXtermRenderer, resumeXtermRendererIfNeeded } from '@ui/libs/terminal/resumeRenderer';
import { scrollTerminalToBottomNow, writeTerminalHistory } from '@ui/libs/terminal/scroll';
import { attachTouchScroll } from '@ui/libs/terminal/touchScroll';
import { AURA_TERMINAL_THEME } from '@ui/libs/theme/aura';
import { showToast } from '@ui/modules/toast';
import { FitAddon } from '@xterm/addon-fit';
import { Terminal } from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';
import { useEffect, useRef } from 'react';
import { useIntl } from 'react-intl';
import { styles } from '@ui/modules/shell-split-panel/shellSplitPanel.styles';
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
}: SessionShellTerminalProps) {
    const intl = useIntl();
    const hostRef = useRef<HTMLDivElement | null>(null);
    const connectRef = useRef(connect);
    const onTitleRef = useRef(onTitle);
    const onHandleChangeRef = useRef(onHandleChange);
    const activeRef = useRef(active);

    connectRef.current = connect;
    onTitleRef.current = onTitle;
    onHandleChangeRef.current = onHandleChange;
    activeRef.current = active;

    useEffect(() => {
        const host = hostRef.current;
        if (!host) return;

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

        let socket: WebSocket;
        try {
            socket = connectRef.current();
        } catch (err: unknown) {
            showToast('generic-error', err instanceof Error ? err.message : intl.formatMessage(messages.loadFailed));
            term.dispose();
            return;
        }

        let followOutput = isScrolledToBottom(term);

        const scrollToBottomAndFollow = () => {
            followOutput = true;
            scrollTerminalToBottomNow(term);
        };

        const sendInput = (data: string) => {
            scrollToBottomAndFollow();
            resumeXtermRendererIfNeeded(term);
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

        const onResize = () => {
            const scheduledEpoch = getPanelResizeDragEpoch();
            requestAnimationFrame(() => {
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

        socket.addEventListener('open', () => {
            onResize();
        });

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
            scrollDisposable.dispose();
            clearPtyResize(term);
            socket.close();
            term.dispose();
        };
    }, [shellKey, intl]);

    return (
        <div className={styles.shellTerminalPane}>
            <div ref={hostRef} className={styles.shellTerminal} />
        </div>
    );
}
