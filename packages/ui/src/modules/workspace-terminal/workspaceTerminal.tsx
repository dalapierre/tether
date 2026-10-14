import { Panel } from '@ui/components/panel';
import { PanelResizeHandle, panelResizeHandleMessages } from '@ui/components/panel-resize-handle';
import { Tooltip } from '@ui/components/tooltip';
import { connectWorkspaceShell, killWorkspaceShell, MAX_WORKSPACE_SHELLS } from '@ui/libs/api/workspace';
import {
    clampShellListWidthPx,
    getShellListWidthPx,
    getWorkspaceShellRoster,
    setShellListWidthPx,
    setWorkspaceShellRoster,
    type ShellRosterEntry,
} from '@ui/libs/layout/reviewLayoutPreferences';
import {
    WORKSPACE_TERMINAL_ID,
    setTerminalTabTitle,
    terminalTabId,
    useEditorTabNavigation,
} from '@ui/modules/editor-tabs';
import { messages } from '@ui/modules/session-view/sessionView.messages';
import { styles as sessionStyles } from '@ui/modules/session-view/sessionView.styles';
import { SessionShellTerminal, type SessionShellTerminalHandle } from '@ui/modules/session-view/sessionShellTerminal';
import { showToast } from '@ui/modules/toast';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import {
    consumeWorkspaceShellSplitRequests,
    subscribeWorkspaceShellSplitRequests,
} from './workspaceShellSplitRequests';
import { styles } from './workspaceTerminal.styles';

type ShellEntry = ShellRosterEntry;

/** Client-side shell ids; avoid `crypto.randomUUID` (secure-context only — fails on LAN HTTP). */
function createShellId(): string {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function loadOrCreateShellRoster(defaultTitle: string): { shells: ShellEntry[]; activeShellId: string } {
    const stored = getWorkspaceShellRoster();
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
    setWorkspaceShellRoster({ shells, activeShellId: id });
    return { shells, activeShellId: id };
}

function SplitShellIcon() {
    return (
        <svg
            className={sessionStyles.shellToolbarIcon}
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
            className={sessionStyles.shellToolbarIcon}
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

function KillShellIcon() {
    return (
        <svg
            className={sessionStyles.shellListKillIcon}
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

export function WorkspaceTerminal() {
    const intl = useIntl();
    const { closeTab } = useEditorTabNavigation();
    const defaultTitle = intl.formatMessage(messages.terminalView);
    const initialRosterRef = useRef<{ shells: ShellEntry[]; activeShellId: string } | null>(null);
    if (initialRosterRef.current === null) {
        initialRosterRef.current = loadOrCreateShellRoster(defaultTitle);
    }
    const [shells, setShells] = useState<ShellEntry[]>(() => initialRosterRef.current!.shells);
    const [activeShellId, setActiveShellId] = useState(() => initialRosterRef.current!.activeShellId);
    const [listWidthPx, setListWidthPx] = useState(getShellListWidthPx);
    const listWidthPxRef = useRef(listWidthPx);
    const handlesRef = useRef(new Map<string, SessionShellTerminalHandle>());
    const activeShellIdRef = useRef(activeShellId);
    const shellsRef = useRef(shells);

    listWidthPxRef.current = listWidthPx;
    activeShellIdRef.current = activeShellId;
    shellsRef.current = shells;

    useEffect(() => {
        setWorkspaceShellRoster({ shells, activeShellId });
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

    const fitAll = useCallback(() => {
        for (const handle of handlesRef.current.values()) {
            handle.fit();
        }
    }, []);

    useEffect(() => {
        const scheduled = () => {
            fitAll();
            focusActive();
        };
        requestAnimationFrame(scheduled);
    }, [listWidthPx, shells.length, fitAll, focusActive]);

    const closePanel = useCallback(() => {
        closeTab(terminalTabId(WORKSPACE_TERMINAL_ID));
    }, [closeTab]);

    const splitShell = useCallback(() => {
        if (shellsRef.current.length >= MAX_WORKSPACE_SHELLS) return;
        const id = createShellId();
        setShells((current) => [...current, { id, title: defaultTitle }]);
        setActiveShellId(id);
    }, [defaultTitle]);

    useEffect(() => {
        const applyPending = () => {
            const count = consumeWorkspaceShellSplitRequests();
            if (count <= 0) return;
            setShells((current) => {
                if (current.length >= MAX_WORKSPACE_SHELLS) return current;
                const next = [...current];
                let activeId = activeShellIdRef.current;
                for (let i = 0; i < count && next.length < MAX_WORKSPACE_SHELLS; i += 1) {
                    const id = createShellId();
                    next.push({ id, title: defaultTitle });
                    activeId = id;
                }
                if (activeId !== activeShellIdRef.current) {
                    setActiveShellId(activeId);
                }
                return next;
            });
        };
        applyPending();
        return subscribeWorkspaceShellSplitRequests(applyPending);
    }, [defaultTitle]);

    function selectShell(shellId: string) {
        setActiveShellId(shellId);
        requestAnimationFrame(() => {
            handlesRef.current.get(shellId)?.focus();
        });
    }

    function killShell(shellId: string) {
        if (shells.length <= 1) {
            closePanel();
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

        void killWorkspaceShell(shellId).catch((err: unknown) => {
            showToast('generic-error', err instanceof Error ? err.message : intl.formatMessage(messages.loadFailed));
        });
    }

    const canSplit = shells.length < MAX_WORKSPACE_SHELLS;
    const splitLabel = intl.formatMessage(messages.splitTerminal);
    const activeTitle = shells.find((shell) => shell.id === activeShellId)?.title;

    useEffect(() => {
        if (activeTitle) {
            setTerminalTabTitle(WORKSPACE_TERMINAL_ID, activeTitle);
        }
    }, [activeTitle]);

    return (
        <Panel
            className={styles.root}
            title={intl.formatMessage(messages.terminalView)}
            toolbarClassName='relative z-10'
            toolbarActions={
                <div className={sessionStyles.shellToolbarActions}>
                    <Tooltip content={splitLabel}>
                        <button
                            type='button'
                            className={sessionStyles.shellToolbarButton}
                            aria-label={splitLabel}
                            disabled={!canSplit}
                            onClick={splitShell}
                        >
                            <SplitShellIcon />
                        </button>
                    </Tooltip>
                    <span className={sessionStyles.shellToolbarSeparator} aria-hidden='true' />
                    <Tooltip content={intl.formatMessage(messages.closeTerminal)}>
                        <button
                            type='button'
                            className={sessionStyles.shellToolbarButton}
                            aria-label={intl.formatMessage(messages.closeTerminal)}
                            onClick={closePanel}
                        >
                            <CloseShellIcon />
                        </button>
                    </Tooltip>
                </div>
            }
        >
            <div className={sessionStyles.shellPanelBody}>
                <div className={sessionStyles.shellSplits}>
                    {shells.map((shell) => (
                        <div
                            key={shell.id}
                            className={sessionStyles.shellSplitPane}
                            onMouseDown={() => {
                                if (activeShellId !== shell.id) {
                                    setActiveShellId(shell.id);
                                }
                            }}
                        >
                            <SessionShellTerminal
                                shellKey={`workspace:${shell.id}`}
                                connect={() => connectWorkspaceShell(shell.id)}
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
                <div className={sessionStyles.shellListRail} style={{ width: listWidthPx }}>
                    <PanelResizeHandle
                        edge='leading'
                        ariaLabel={intl.formatMessage(panelResizeHandleMessages.resizeTerminalList)}
                        onResize={(delta) => setListWidthPx((width) => clampShellListWidthPx(width - delta))}
                        onResizeEnd={persistListWidth}
                    />
                    <div className={sessionStyles.shellList} role='tablist' aria-orientation='vertical'>
                        {shells.map((shell) => {
                            const selected = shell.id === activeShellId;
                            const killLabel = intl.formatMessage(messages.killTerminalInstance, {
                                name: shell.title,
                            });
                            return (
                                <div
                                    key={shell.id}
                                    className={`${sessionStyles.shellListItem}${
                                        selected ? ` ${sessionStyles.shellListItemActive}` : ''
                                    }`}
                                >
                                    <Tooltip content={shell.title}>
                                        <button
                                            type='button'
                                            role='tab'
                                            aria-selected={selected}
                                            className={sessionStyles.shellListTab}
                                            onClick={() => selectShell(shell.id)}
                                            onMouseDown={(event) => {
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
                                            <span className={sessionStyles.shellListTabLabel}>{shell.title}</span>
                                        </button>
                                    </Tooltip>
                                    <Tooltip content={killLabel}>
                                        <button
                                            type='button'
                                            className={sessionStyles.shellListKill}
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
            </div>
        </Panel>
    );
}
