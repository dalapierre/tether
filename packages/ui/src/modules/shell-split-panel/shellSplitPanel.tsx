import { Panel } from '@ui/components/panel';
import { PanelResizeHandle, panelResizeHandleMessages } from '@ui/components/panel-resize-handle';
import { Tooltip } from '@ui/components/tooltip';
import {
    clampShellListWidthPx,
    getShellListWidthPx,
    setShellListWidthPx,
    type ShellRosterEntry,
    type ShellRosterState,
} from '@ui/libs/layout/reviewLayoutPreferences';
import { SessionShellTerminal, type SessionShellTerminalHandle } from '@ui/modules/session-view/sessionShellTerminal';
import { showToast } from '@ui/modules/toast';
import { useCallback, useEffect, useRef, useState, type CSSProperties, type MutableRefObject } from 'react';
import { useIntl } from 'react-intl';
import { messages } from './shellSplitPanel.messages';
import { styles } from './shellSplitPanel.styles';

export type ShellSplitPanelApi = {
    focusActive: () => void;
    blurActive: () => void;
    fitAll: (options?: { afterPanelResize?: boolean; followById?: Map<string, boolean> }) => void;
    captureFollowIntent: () => Map<string, boolean>;
    /** Append a shell split when under the max. */
    split: () => void;
    /**
     * Split (same as the toolbar button), then run the default harness CLI in the
     * new pane with `prompt`. Does not create a Tether session. Returns false at cap.
     */
    splitWithHarnessPrompt: (prompt: string) => boolean;
};

export type ShellSplitPanelProps = {
    className?: string;
    style?: CSSProperties;
    'aria-hidden'?: boolean;
    /** Prefix for per-pane terminal remount keys. */
    scopeKey: string;
    maxShells: number;
    getRoster: () => ShellRosterState | null;
    setRoster: (state: ShellRosterState) => void;
    connect: (shellId: string) => WebSocket;
    killShell: (shellId: string) => Promise<void>;
    /** Close the whole terminal panel (kills remaining shells). */
    onClose: () => void;
    /** Toolbar close control. Defaults to true (session pane); root terminal hides it. */
    showCloseButton?: boolean;
    /** When false, skips fit/focus side effects (session pane hidden). Defaults to true. */
    visible?: boolean;
    isDesktop?: boolean;
    fullscreen?: boolean;
    onToggleFullscreen?: () => void;
    apiRef?: MutableRefObject<ShellSplitPanelApi | null>;
    onActiveTitleChange?: (title: string) => void;
    /** Highlighted shell text → explain (session: prompt harness; workspace: split + CLI). */
    onExplain?: (errorMessage: string, command: string) => void;
};

type ShellEntry = ShellRosterEntry;

/** Client-side shell ids; avoid `crypto.randomUUID` (secure-context only — fails on LAN HTTP). */
function createShellId(): string {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function loadOrCreateShellRoster(
    getRoster: () => ShellRosterState | null,
    setRoster: (state: ShellRosterState) => void,
    defaultTitle: string,
): { shells: ShellEntry[]; activeShellId: string } {
    const stored = getRoster();
    if (stored) {
        return {
            shells: stored.shells.map((shell) => ({
                id: shell.id,
                title: shell.title || defaultTitle,
            })),
            activeShellId: stored.activeShellId,
        };
    }

    const id = createShellId();
    const shells = [{ id, title: defaultTitle }];
    // Persist immediately so a fast session switch still remembers this shell id.
    setRoster({ shells, activeShellId: id });
    return { shells, activeShellId: id };
}

function SplitShellIcon() {
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
                d='M3.75 4.5h16.5A.75.75 0 0 1 21 5.25v13.5a.75.75 0 0 1-.75.75H3.75a.75.75 0 0 1-.75-.75V5.25a.75.75 0 0 1 .75-.75ZM12 4.5v15'
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

function KillShellIcon() {
    return (
        <svg
            className={styles.shellListKillIcon}
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

export function ShellSplitPanel({
    className,
    style,
    'aria-hidden': ariaHidden,
    scopeKey,
    maxShells,
    getRoster,
    setRoster,
    connect,
    killShell: killShellRemote,
    onClose,
    showCloseButton = true,
    visible = true,
    isDesktop = true,
    fullscreen = false,
    onToggleFullscreen,
    apiRef,
    onActiveTitleChange,
    onExplain,
}: ShellSplitPanelProps) {
    const intl = useIntl();
    const defaultTitle = intl.formatMessage(messages.terminalView);
    const setRosterRef = useRef(setRoster);
    setRosterRef.current = setRoster;

    const initialRosterRef = useRef<{ shells: ShellEntry[]; activeShellId: string } | null>(null);
    if (initialRosterRef.current === null) {
        initialRosterRef.current = loadOrCreateShellRoster(getRoster, setRoster, defaultTitle);
    }
    const [shells, setShells] = useState<ShellEntry[]>(() => initialRosterRef.current!.shells);
    const [activeShellId, setActiveShellId] = useState(() => initialRosterRef.current!.activeShellId);
    /** Pending `runHarness` prompts keyed by shell id (consumed after connect). */
    const [harnessPrompts, setHarnessPrompts] = useState<Record<string, string>>({});
    const [listWidthPx, setListWidthPx] = useState(getShellListWidthPx);
    const listWidthPxRef = useRef(listWidthPx);
    const handlesRef = useRef(new Map<string, SessionShellTerminalHandle>());
    const prevVisibleRef = useRef(false);
    const activeShellIdRef = useRef(activeShellId);
    const shellsRef = useRef(shells);
    const connectRef = useRef(connect);
    const killShellRemoteRef = useRef(killShellRemote);
    const onCloseRef = useRef(onClose);
    const onActiveTitleChangeRef = useRef(onActiveTitleChange);

    listWidthPxRef.current = listWidthPx;
    activeShellIdRef.current = activeShellId;
    shellsRef.current = shells;
    connectRef.current = connect;
    killShellRemoteRef.current = killShellRemote;
    onCloseRef.current = onClose;
    onActiveTitleChangeRef.current = onActiveTitleChange;

    useEffect(() => {
        setRosterRef.current({ shells, activeShellId });
    }, [shells, activeShellId]);

    const persistListWidth = useCallback(() => {
        setShellListWidthPx(listWidthPxRef.current);
    }, []);

    const setHandle = useCallback((shellId: string, handle: SessionShellTerminalHandle | null) => {
        if (handle) {
            handlesRef.current.set(shellId, handle);
        } else {
            handlesRef.current.delete(shellId);
        }
    }, []);

    const focusActive = useCallback(() => {
        const id = activeShellIdRef.current;
        handlesRef.current.get(id)?.focus();
    }, []);

    const blurActive = useCallback(() => {
        const id = activeShellIdRef.current;
        handlesRef.current.get(id)?.blur();
    }, []);

    const captureFollowIntent = useCallback(() => {
        const map = new Map<string, boolean>();
        for (const [id, handle] of handlesRef.current) {
            map.set(id, handle.isFollowOutput());
        }
        return map;
    }, []);

    const fitAll = useCallback((options?: { afterPanelResize?: boolean; followById?: Map<string, boolean> }) => {
        for (const [id, handle] of handlesRef.current) {
            handle.fit({
                afterPanelResize: options?.afterPanelResize,
                followOutput: options?.followById?.get(id),
            });
        }
    }, []);

    const splitShell = useCallback(() => {
        if (shellsRef.current.length >= maxShells) return;
        const id = createShellId();
        setShells((current) => [...current, { id, title: defaultTitle }]);
        setActiveShellId(id);
    }, [defaultTitle, maxShells]);

    const splitWithHarnessPrompt = useCallback(
        (prompt: string) => {
            const trimmed = prompt.trim();
            if (!trimmed || shellsRef.current.length >= maxShells) return false;
            const id = createShellId();
            setHarnessPrompts((current) => ({ ...current, [id]: trimmed }));
            setShells((current) => [...current, { id, title: defaultTitle }]);
            setActiveShellId(id);
            return true;
        },
        [defaultTitle, maxShells],
    );

    const clearHarnessPrompt = useCallback((shellId: string) => {
        setHarnessPrompts((current) => {
            if (!(shellId in current)) return current;
            const next = { ...current };
            delete next[shellId];
            return next;
        });
    }, []);

    useEffect(() => {
        if (!apiRef) return;
        apiRef.current = {
            focusActive,
            blurActive,
            fitAll,
            captureFollowIntent,
            split: splitShell,
            splitWithHarnessPrompt,
        };
        return () => {
            apiRef.current = null;
        };
    }, [apiRef, focusActive, blurActive, fitAll, captureFollowIntent, splitShell, splitWithHarnessPrompt]);

    useEffect(() => {
        const becameVisible = visible && !prevVisibleRef.current;
        prevVisibleRef.current = visible;
        if (!visible) return;

        const scheduled = () => {
            fitAll();
            if (becameVisible) {
                focusActive();
            }
        };
        requestAnimationFrame(scheduled);
    }, [visible, fullscreen, listWidthPx, shells.length, fitAll, focusActive]);

    const activeTitle = shells.find((shell) => shell.id === activeShellId)?.title;
    useEffect(() => {
        if (activeTitle) {
            onActiveTitleChangeRef.current?.(activeTitle);
        }
    }, [activeTitle]);

    function selectShell(shellId: string) {
        setActiveShellId(shellId);
        requestAnimationFrame(() => {
            handlesRef.current.get(shellId)?.focus();
        });
    }

    function killShell(shellId: string) {
        if (shells.length <= 1) {
            // Closing the last instance tears down the whole panel (and all PTYs).
            onCloseRef.current();
            return;
        }

        const remaining = shells.filter((shell) => shell.id !== shellId);
        setShells(remaining);
        handlesRef.current.delete(shellId);

        if (activeShellId === shellId) {
            const nextId = remaining[remaining.length - 1]?.id ?? '';
            setActiveShellId(nextId);
            if (nextId) {
                requestAnimationFrame(() => {
                    handlesRef.current.get(nextId)?.focus();
                });
            }
        }

        void killShellRemoteRef.current(shellId).catch((err: unknown) => {
            showToast('generic-error', err instanceof Error ? err.message : intl.formatMessage(messages.loadFailed));
        });
    }

    const canSplit = shells.length < maxShells;
    const splitLabel = intl.formatMessage(messages.splitTerminal);
    const showListRail = shells.length > 1;
    const showFullscreenButton = Boolean(isDesktop && onToggleFullscreen);
    const showToolbarTail = showFullscreenButton || showCloseButton;

    return (
        <Panel
            className={className}
            style={style}
            aria-hidden={ariaHidden}
            title={intl.formatMessage(messages.terminalView)}
            toolbarClassName='relative z-10'
            toolbarActions={
                <div className={styles.shellToolbarActions}>
                    <Tooltip content={splitLabel}>
                        <button
                            type='button'
                            className={styles.shellToolbarButton}
                            aria-label={splitLabel}
                            disabled={!canSplit}
                            onClick={splitShell}
                        >
                            <SplitShellIcon />
                        </button>
                    </Tooltip>
                    {showToolbarTail ? <span className={styles.shellToolbarSeparator} aria-hidden='true' /> : null}
                    {showFullscreenButton ? (
                        <Tooltip
                            content={intl.formatMessage(
                                fullscreen ? messages.exitFullscreenTerminal : messages.enterFullscreenTerminal,
                            )}
                        >
                            <button
                                type='button'
                                className={`${styles.shellToolbarButton}${
                                    fullscreen ? ` ${styles.shellToolbarButtonActive}` : ''
                                }`}
                                aria-label={intl.formatMessage(
                                    fullscreen ? messages.exitFullscreenTerminal : messages.enterFullscreenTerminal,
                                )}
                                aria-pressed={fullscreen}
                                onClick={onToggleFullscreen}
                            >
                                {fullscreen ? <ExitFullscreenShellIcon /> : <FullscreenShellIcon />}
                            </button>
                        </Tooltip>
                    ) : null}
                    {showCloseButton ? (
                        <Tooltip content={intl.formatMessage(messages.closeTerminal)}>
                            <button
                                type='button'
                                className={styles.shellToolbarButton}
                                aria-label={intl.formatMessage(messages.closeTerminal)}
                                onClick={onClose}
                            >
                                <CloseShellIcon />
                            </button>
                        </Tooltip>
                    ) : null}
                </div>
            }
        >
            <div className={styles.shellPanelBody}>
                <div className={styles.shellSplits}>
                    {shells.map((shell) => (
                        <div
                            key={shell.id}
                            className={styles.shellSplitPane}
                            onMouseDown={() => {
                                if (activeShellId !== shell.id) {
                                    setActiveShellId(shell.id);
                                }
                            }}
                        >
                            <SessionShellTerminal
                                shellKey={`${scopeKey}:${shell.id}`}
                                connect={() => connectRef.current(shell.id)}
                                active={activeShellId === shell.id}
                                onTitle={(title) => {
                                    setShells((current) =>
                                        current.map((entry) => (entry.id === shell.id ? { ...entry, title } : entry)),
                                    );
                                }}
                                onHandleChange={(handle) => setHandle(shell.id, handle)}
                                onExplain={onExplain}
                                harnessPrompt={harnessPrompts[shell.id]}
                                onHarnessPromptConsumed={() => clearHarnessPrompt(shell.id)}
                            />
                        </div>
                    ))}
                </div>
                {showListRail ? (
                    <div className={styles.shellListRail} style={{ width: listWidthPx }}>
                        <PanelResizeHandle
                            edge='leading'
                            ariaLabel={intl.formatMessage(panelResizeHandleMessages.resizeTerminalList)}
                            onResize={(delta) => setListWidthPx((width) => clampShellListWidthPx(width - delta))}
                            onResizeEnd={persistListWidth}
                        />
                        <div className={styles.shellList} role='tablist' aria-orientation='vertical'>
                            {shells.map((shell) => {
                                const selected = shell.id === activeShellId;
                                const killLabel = intl.formatMessage(messages.killTerminalInstance, {
                                    name: shell.title,
                                });
                                return (
                                    <div
                                        key={shell.id}
                                        className={`${styles.shellListItem}${
                                            selected ? ` ${styles.shellListItemActive}` : ''
                                        }`}
                                    >
                                        <Tooltip content={shell.title}>
                                            <button
                                                type='button'
                                                role='tab'
                                                aria-selected={selected}
                                                className={styles.shellListTab}
                                                onClick={() => selectShell(shell.id)}
                                                onMouseDown={(event) => {
                                                    // Prevent the browser autoscroll cursor on middle-click.
                                                    if (event.button === 1) {
                                                        event.preventDefault();
                                                    }
                                                }}
                                                onAuxClick={(event) => {
                                                    if (event.button !== 1) return;
                                                    event.preventDefault();
                                                    killShell(shell.id);
                                                }}
                                            >
                                                <span className={styles.shellListTabLabel}>{shell.title}</span>
                                            </button>
                                        </Tooltip>
                                        <Tooltip content={killLabel}>
                                            <button
                                                type='button'
                                                className={styles.shellListKill}
                                                aria-label={killLabel}
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    killShell(shell.id);
                                                }}
                                            >
                                                <KillShellIcon />
                                            </button>
                                        </Tooltip>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : null}
            </div>
        </Panel>
    );
}
