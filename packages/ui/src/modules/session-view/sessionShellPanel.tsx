import { Panel } from '@ui/components/panel';
import { PanelResizeHandle, panelResizeHandleMessages } from '@ui/components/panel-resize-handle';
import { killSessionShell, MAX_SESSION_SHELLS } from '@ui/libs/api/sessions';
import {
    clampShellListWidthPx,
    getShellListWidthPx,
    setShellListWidthPx,
} from '@ui/libs/layout/reviewLayoutPreferences';
import { showToast } from '@ui/modules/toast';
import { useCallback, useEffect, useRef, useState, type CSSProperties, type MutableRefObject } from 'react';
import { useIntl } from 'react-intl';
import { messages } from './sessionView.messages';
import { styles } from './sessionView.styles';
import { SessionShellTerminal, type SessionShellTerminalHandle } from './sessionShellTerminal';

export type SessionShellPanelApi = {
    focusActive: () => void;
    blurActive: () => void;
    fitAll: (options?: { afterPanelResize?: boolean; followById?: Map<string, boolean> }) => void;
    captureFollowIntent: () => Map<string, boolean>;
};

export type SessionShellPanelProps = {
    sessionId: string;
    className: string;
    style?: CSSProperties;
    'aria-hidden'?: boolean;
    isDesktop: boolean;
    fullscreen: boolean;
    visible: boolean;
    onToggleFullscreen?: () => void;
    /** Close the whole terminal panel (kills remaining shells). */
    onClose: () => void;
    apiRef?: MutableRefObject<SessionShellPanelApi | null>;
};

type ShellEntry = {
    id: string;
    title: string;
};

function createShellId(): string {
    return crypto.randomUUID();
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

export function SessionShellPanel({
    sessionId,
    className,
    style,
    'aria-hidden': ariaHidden,
    isDesktop,
    fullscreen,
    visible,
    onToggleFullscreen,
    onClose,
    apiRef,
}: SessionShellPanelProps) {
    const intl = useIntl();
    const defaultTitle = intl.formatMessage(messages.terminalView);
    const initialShellIdRef = useRef(createShellId());
    const [shells, setShells] = useState<ShellEntry[]>(() => [{ id: initialShellIdRef.current, title: defaultTitle }]);
    const [activeShellId, setActiveShellId] = useState(initialShellIdRef.current);
    const [listWidthPx, setListWidthPx] = useState(getShellListWidthPx);
    const listWidthPxRef = useRef(listWidthPx);
    const handlesRef = useRef(new Map<string, SessionShellTerminalHandle>());
    const prevVisibleRef = useRef(false);
    const activeShellIdRef = useRef(activeShellId);

    listWidthPxRef.current = listWidthPx;
    activeShellIdRef.current = activeShellId;

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

    useEffect(() => {
        if (!apiRef) return;
        apiRef.current = {
            focusActive,
            blurActive,
            fitAll,
            captureFollowIntent,
        };
        return () => {
            apiRef.current = null;
        };
    }, [apiRef, focusActive, blurActive, fitAll, captureFollowIntent]);

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

    function splitShell() {
        if (shells.length >= MAX_SESSION_SHELLS) return;
        const id = createShellId();
        setShells((current) => [...current, { id, title: defaultTitle }]);
        setActiveShellId(id);
    }

    function selectShell(shellId: string) {
        setActiveShellId(shellId);
        requestAnimationFrame(() => {
            handlesRef.current.get(shellId)?.focus();
        });
    }

    function killShell(shellId: string) {
        if (shells.length <= 1) {
            // Closing the last instance tears down the whole panel (and all PTYs).
            onClose();
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

        void killSessionShell(sessionId, shellId).catch((err: unknown) => {
            showToast('generic-error', err instanceof Error ? err.message : intl.formatMessage(messages.loadFailed));
        });
    }

    const canSplit = shells.length < MAX_SESSION_SHELLS;
    const splitLabel = intl.formatMessage(messages.splitTerminal);

    return (
        <Panel
            className={className}
            style={style}
            aria-hidden={ariaHidden}
            title={intl.formatMessage(messages.terminalView)}
            toolbarClassName='relative z-10'
            toolbarActions={
                <div className={styles.shellToolbarActions}>
                    <button
                        type='button'
                        className={styles.shellToolbarButton}
                        title={splitLabel}
                        aria-label={splitLabel}
                        disabled={!canSplit}
                        onClick={splitShell}
                    >
                        <SplitShellIcon />
                    </button>
                    <span className={styles.shellToolbarSeparator} aria-hidden='true' />
                    {isDesktop && onToggleFullscreen ? (
                        <button
                            type='button'
                            className={`${styles.shellToolbarButton}${
                                fullscreen ? ` ${styles.shellToolbarButtonActive}` : ''
                            }`}
                            title={intl.formatMessage(
                                fullscreen ? messages.exitFullscreenTerminal : messages.enterFullscreenTerminal,
                            )}
                            aria-label={intl.formatMessage(
                                fullscreen ? messages.exitFullscreenTerminal : messages.enterFullscreenTerminal,
                            )}
                            aria-pressed={fullscreen}
                            onClick={onToggleFullscreen}
                        >
                            {fullscreen ? <ExitFullscreenShellIcon /> : <FullscreenShellIcon />}
                        </button>
                    ) : null}
                    <button
                        type='button'
                        className={styles.shellToolbarButton}
                        title={intl.formatMessage(messages.closeTerminal)}
                        aria-label={intl.formatMessage(messages.closeTerminal)}
                        onClick={onClose}
                    >
                        <CloseShellIcon />
                    </button>
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
                                sessionId={sessionId}
                                shellId={shell.id}
                                active={activeShellId === shell.id}
                                onTitle={(title) => {
                                    setShells((current) =>
                                        current.map((entry) => (entry.id === shell.id ? { ...entry, title } : entry)),
                                    );
                                }}
                                onHandleChange={(handle) => setHandle(shell.id, handle)}
                            />
                        </div>
                    ))}
                </div>
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
                                    <button
                                        type='button'
                                        role='tab'
                                        aria-selected={selected}
                                        className={styles.shellListTab}
                                        title={shell.title}
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
                                    <button
                                        type='button'
                                        className={styles.shellListKill}
                                        title={killLabel}
                                        aria-label={killLabel}
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            killShell(shell.id);
                                        }}
                                    >
                                        <KillShellIcon />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </Panel>
    );
}
