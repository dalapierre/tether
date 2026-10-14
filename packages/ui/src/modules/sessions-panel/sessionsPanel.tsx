import { ConfirmDialog } from '@ui/components/confirm-dialog';
import { Panel } from '@ui/components/panel';
import { Spinner } from '@ui/components/spinner';
import { Tooltip } from '@ui/components/tooltip';
import {
    deleteQuickPrompt,
    listQuickPrompts,
    QUICK_PROMPTS_CHANGED_EVENT,
    type QuickPrompt,
} from '@ui/libs/api/quickPrompts';
import { listRepositories, type Repository } from '@ui/libs/api/repositories';
import { deleteSession, restartSession, type Session, type SessionStatus } from '@ui/libs/api/sessions';
import { useIsDesktop } from '@ui/libs/dom/useMediaQuery';
import { useKeybind } from '@ui/libs/keybinds';
import {
    closeQuickPromptEditorTab,
    closeSessionEditorTab,
    pathForEditorTab,
    pruneMissingQuickPromptTabs,
    useEditorTabNavigation,
} from '@ui/modules/editor-tabs';
import {
    getSessionsSnapshot,
    hasSessionsSnapshot,
    removeSession,
    subscribe,
    upsertSession,
    upsertSessionStatus,
} from '@ui/modules/session-events';
import { useSettings } from '@ui/modules/settings';
import { showToast } from '@ui/modules/toast';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { useIntl } from 'react-intl';
import { useMatch, useNavigate } from 'react-router-dom';
import { messages } from './sessionsPanel.messages';
import { styles } from './sessionsPanel.styles';
import type { SessionsPanelProps } from './sessionsPanel.types';

function PlusIcon({ className = styles.plusIcon }: { className?: string }) {
    return (
        <svg
            className={className}
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            aria-hidden='true'
        >
            <path strokeLinecap='round' strokeLinejoin='round' d='M12 4.5v15m7.5-7.5h-15' />
        </svg>
    );
}

function ClearSearchIcon() {
    return (
        <svg
            className={styles.searchClearIcon}
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

function SettingsIcon({ className = styles.settingsIcon }: { className?: string }) {
    return (
        <svg
            className={className}
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='1.75'
            aria-hidden='true'
        >
            <path
                strokeLinecap='round'
                strokeLinejoin='round'
                d='M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065'
            />
            <path strokeLinecap='round' strokeLinejoin='round' d='M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0' />
        </svg>
    );
}

function ListIcon() {
    return (
        <svg
            className={styles.listIcon}
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='1.75'
            aria-hidden='true'
        >
            <path strokeLinecap='round' strokeLinejoin='round' d='M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5' />
        </svg>
    );
}

function QuickPromptListIcon() {
    return (
        <svg
            className={styles.listIcon}
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='1.75'
            aria-hidden='true'
        >
            <path
                strokeLinecap='round'
                strokeLinejoin='round'
                d='M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z'
            />
        </svg>
    );
}

type SideListMode = 'sessions' | 'quickPrompts';

function RestartIcon() {
    return (
        <svg
            className={styles.restartIcon}
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            aria-hidden='true'
        >
            <path
                strokeLinecap='round'
                strokeLinejoin='round'
                d='M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182'
            />
        </svg>
    );
}

function MoreIcon() {
    return (
        <svg className={styles.moreIcon} viewBox='0 0 24 24' fill='currentColor' aria-hidden='true'>
            <path d='M6.75 12a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0ZM12.75 12a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0ZM18.75 12a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z' />
        </svg>
    );
}

function usageClassName(percent: number): string {
    if (percent > 60) return styles.usageDanger;
    if (percent >= 30) return styles.usageWarning;
    return styles.usage;
}

function indicatorClass(status: SessionStatus): string {
    switch (status) {
        case 'ready':
            return styles.indicatorReady;
        case 'busy':
            return styles.indicatorBusy;
        case 'error':
            return styles.indicatorError;
        case 'initializing':
            return styles.indicatorBusy;
    }
}

function sessionButtonClass(active: boolean, selected: boolean): string {
    if (active) return styles.sessionButtonActive;
    if (selected) return styles.sessionButtonSelected;
    return styles.sessionButton;
}

export function SessionsPanel({
    listInteractive = true,
    sessionListOpen = true,
    onSessionListOpenChange,
}: SessionsPanelProps) {
    const intl = useIntl();
    const navigate = useNavigate();
    const isDesktop = useIsDesktop();
    const sessionMatch = useMatch('/sessions/:sessionId');
    const quickPromptMatch = useMatch('/quick-prompts/:promptId');
    const activeSessionId = sessionMatch?.params.sessionId;
    const activeQuickPromptId = quickPromptMatch?.params.promptId;
    const { openSettings } = useSettings();
    const { openSessionTab, openNewSessionTab, openNewQuickPromptTab, openQuickPromptTab, openTerminalTab } =
        useEditorTabNavigation();
    const [repositories, setRepositories] = useState<Repository[]>([]);
    const [listMode, setListMode] = useState<SideListMode>('sessions');
    const [searchQuery, setSearchQuery] = useState('');
    const [promptSearchQuery, setPromptSearchQuery] = useState('');
    const [quickPrompts, setQuickPrompts] = useState<QuickPrompt[]>([]);
    const [quickPromptsLoading, setQuickPromptsLoading] = useState(false);
    const [pendingDelete, setPendingDelete] = useState<Session | null>(null);
    const [pendingDeletePrompt, setPendingDeletePrompt] = useState<QuickPrompt | null>(null);
    const [actionsMenu, setActionsMenu] = useState<{
        session: Session;
        top: number;
        right: number;
    } | null>(null);
    const [promptActionsMenu, setPromptActionsMenu] = useState<{
        prompt: QuickPrompt;
        top: number;
        right: number;
    } | null>(null);
    const [createMenu, setCreateMenu] = useState<{ top: number; left: number } | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [deletingPromptId, setDeletingPromptId] = useState<string | null>(null);
    const [restartingId, setRestartingId] = useState<string | null>(null);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const selectedRowRef = useRef<HTMLDivElement | null>(null);
    const searchInputRef = useRef<HTMLInputElement | null>(null);
    const promptSearchInputRef = useRef<HTMLInputElement | null>(null);
    const actionsMenuRef = useRef<HTMLDivElement | null>(null);
    const promptActionsMenuRef = useRef<HTMLDivElement | null>(null);
    const createMenuRef = useRef<HTMLDivElement | null>(null);
    const filteredSessionsRef = useRef<Session[]>([]);
    const selectedIndexRef = useRef(selectedIndex);
    selectedIndexRef.current = selectedIndex;

    /** Mobile always shows the list; desktop keeps it mounted so the grid can animate open/closed. */
    const listVisible = !isDesktop || sessionListOpen;
    const sessionsListActive = listMode === 'sessions' && listVisible;
    const quickPromptsListActive = listMode === 'quickPrompts' && listVisible;

    const showSideList = useCallback(
        (mode: SideListMode) => {
            setListMode(mode);
            if (!sessionListOpen) {
                onSessionListOpenChange?.(true);
            }
        },
        [onSessionListOpenChange, sessionListOpen],
    );

    const toggleSessionList = useCallback(() => {
        if (sessionListOpen && listMode === 'sessions') {
            onSessionListOpenChange?.(false);
            return;
        }
        showSideList('sessions');
    }, [listMode, onSessionListOpenChange, sessionListOpen, showSideList]);

    const toggleQuickPromptList = useCallback(() => {
        if (sessionListOpen && listMode === 'quickPrompts') {
            onSessionListOpenChange?.(false);
            return;
        }
        showSideList('quickPrompts');
    }, [listMode, onSessionListOpenChange, sessionListOpen, showSideList]);

    const liveSessions = useSyncExternalStore(subscribe, getSessionsSnapshot, getSessionsSnapshot);
    const sessionsLoading = !useSyncExternalStore(subscribe, hasSessionsSnapshot, hasSessionsSnapshot);

    const sessions = useMemo(
        () => [...liveSessions.values()].sort((a, b) => b.createdAt - a.createdAt),
        [liveSessions],
    );

    const projectNames = useMemo(
        () => new Map(repositories.map((repository) => [repository.id, repository.name])),
        [repositories],
    );

    const filteredSessions = useMemo(() => {
        const normalized = searchQuery.trim().toLowerCase();
        if (!normalized) return sessions;
        return sessions.filter((session) => {
            const project = projectNames.get(session.repositoryId ?? '') ?? session.repositoryId ?? '';
            return (
                session.name.toLowerCase().includes(normalized) ||
                project.toLowerCase().includes(normalized) ||
                (session.branch?.toLowerCase().includes(normalized) ?? false)
            );
        });
    }, [sessions, searchQuery, projectNames]);

    filteredSessionsRef.current = filteredSessions;

    const filteredQuickPrompts = useMemo(() => {
        const normalized = promptSearchQuery.trim().toLowerCase();
        if (!normalized) return quickPrompts;
        return quickPrompts.filter(
            (prompt) =>
                prompt.name.toLowerCase().includes(normalized) ||
                prompt.description.toLowerCase().includes(normalized) ||
                prompt.prompt.toLowerCase().includes(normalized),
        );
    }, [quickPrompts, promptSearchQuery]);

    // Rail actions stay available while mounted. List navigation only when the list is
    // the primary surface — otherwise arrows/`r` fight session review keybinds.
    const panelFree = !pendingDelete && !pendingDeletePrompt && !actionsMenu && !promptActionsMenu && !createMenu;
    const railActionsEnabled = panelFree;
    const listActionsEnabled = railActionsEnabled && listVisible;
    const navKeybindsEnabled =
        listInteractive &&
        listActionsEnabled &&
        listMode === 'sessions' &&
        !sessionsLoading &&
        filteredSessions.length > 0;

    const closeActionsMenu = useCallback(() => {
        setActionsMenu(null);
    }, []);

    const closePromptActionsMenu = useCallback(() => {
        setPromptActionsMenu(null);
    }, []);

    const closeCreateMenu = useCallback(() => {
        setCreateMenu(null);
    }, []);

    const openActionsMenu = useCallback((session: Session, anchor: HTMLElement) => {
        setCreateMenu(null);
        setPromptActionsMenu(null);
        const rect = anchor.getBoundingClientRect();
        setActionsMenu({
            session,
            top: rect.bottom + 4,
            right: window.innerWidth - rect.right,
        });
    }, []);

    const openPromptActionsMenu = useCallback((prompt: QuickPrompt, anchor: HTMLElement) => {
        setCreateMenu(null);
        setActionsMenu(null);
        const rect = anchor.getBoundingClientRect();
        setPromptActionsMenu({
            prompt,
            top: rect.bottom + 4,
            right: window.innerWidth - rect.right,
        });
    }, []);

    const openCreateMenu = useCallback((anchor: HTMLElement) => {
        setActionsMenu(null);
        setPromptActionsMenu(null);
        const rect = anchor.getBoundingClientRect();
        setCreateMenu({
            top: rect.top,
            left: rect.right + 4,
        });
    }, []);

    const openNewSession = useCallback(() => {
        closeCreateMenu();
        openNewSessionTab();
    }, [closeCreateMenu, openNewSessionTab]);

    const openNewTerminal = useCallback(() => {
        closeCreateMenu();
        openTerminalTab();
    }, [closeCreateMenu, openTerminalTab]);

    const openNewQuickPrompt = useCallback(() => {
        closeCreateMenu();
        openNewQuickPromptTab();
    }, [closeCreateMenu, openNewQuickPromptTab]);

    function blurSearch() {
        if (document.activeElement === searchInputRef.current) {
            searchInputRef.current?.blur();
        }
        if (document.activeElement === promptSearchInputRef.current) {
            promptSearchInputRef.current?.blur();
        }
    }

    useKeybind('home', 'newSession', openNewSession, { enabled: railActionsEnabled });
    useKeybind('home', 'openSettings', () => openSettings(), { enabled: railActionsEnabled });
    useKeybind(
        'home',
        'focusSearch',
        () => {
            if (listMode === 'quickPrompts') {
                promptSearchInputRef.current?.focus();
            } else {
                searchInputRef.current?.focus();
            }
            setSelectedIndex(null);
        },
        { enabled: listActionsEnabled && (listMode === 'quickPrompts' || !sessionsLoading) },
    );
    useKeybind(
        'home',
        'previousSession',
        () => {
            blurSearch();
            setSelectedIndex((current) => {
                const count = filteredSessionsRef.current.length;
                if (count === 0) return null;
                if (current === null) return count - 1;
                return Math.max(0, current - 1);
            });
        },
        { enabled: navKeybindsEnabled, allowInEditable: true },
    );
    useKeybind(
        'home',
        'nextSession',
        () => {
            blurSearch();
            setSelectedIndex((current) => {
                const count = filteredSessionsRef.current.length;
                if (count === 0) return null;
                if (current === null) return 0;
                return Math.min(count - 1, current + 1);
            });
        },
        { enabled: navKeybindsEnabled, allowInEditable: true },
    );
    useKeybind(
        'home',
        'deleteSession',
        () => {
            const index = selectedIndexRef.current;
            const session = index === null ? null : filteredSessionsRef.current[index];
            if (!session) return;
            setPendingDelete(session);
        },
        { enabled: navKeybindsEnabled },
    );
    useKeybind(
        'home',
        'restartSession',
        () => {
            const index = selectedIndexRef.current;
            const session = index === null ? null : filteredSessionsRef.current[index];
            if (!session || session.status !== 'error') return;
            void handleRestart(session);
        },
        { enabled: navKeybindsEnabled && !restartingId },
    );

    useEffect(() => {
        if (!navKeybindsEnabled) return;

        function onKeyDown(event: KeyboardEvent) {
            if (event.defaultPrevented || event.repeat) return;
            if (event.key !== 'Enter') return;
            if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
            if (document.querySelector('[aria-modal="true"]')) return;
            if (document.activeElement === searchInputRef.current) return;

            const index = selectedIndexRef.current;
            const session = index === null ? null : filteredSessionsRef.current[index];
            if (!session) return;

            event.preventDefault();
            openSessionTab(session.id, session.name);
        }

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [navKeybindsEnabled, openSessionTab]);

    useEffect(() => {
        setSelectedIndex((current) => {
            if (filteredSessions.length === 0) return null;
            if (current === null) return null;
            return Math.min(current, filteredSessions.length - 1);
        });
    }, [filteredSessions]);

    useEffect(() => {
        if (!actionsMenu) return;
        if (!liveSessions.has(actionsMenu.session.id)) {
            setActionsMenu(null);
        }
    }, [actionsMenu, liveSessions]);

    useEffect(() => {
        if (!actionsMenu) return;

        function onPointerDown(event: PointerEvent) {
            const target = event.target as Node | null;
            if (!target) return;
            if (actionsMenuRef.current?.contains(target)) return;
            if (target instanceof Element && target.closest('[data-session-actions-trigger]')) return;
            setActionsMenu(null);
        }

        function onKeyDown(event: KeyboardEvent) {
            if (event.key !== 'Escape' || event.defaultPrevented || event.repeat) return;
            event.preventDefault();
            setActionsMenu(null);
        }

        function onScroll() {
            setActionsMenu(null);
        }

        window.addEventListener('pointerdown', onPointerDown);
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('resize', onScroll);
        // Close when the session list scrolls underneath a fixed menu.
        document.addEventListener('scroll', onScroll, true);

        return () => {
            window.removeEventListener('pointerdown', onPointerDown);
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('resize', onScroll);
            document.removeEventListener('scroll', onScroll, true);
        };
    }, [actionsMenu]);

    useEffect(() => {
        if (!createMenu) return;

        function onPointerDown(event: PointerEvent) {
            const target = event.target as Node | null;
            if (!target) return;
            if (createMenuRef.current?.contains(target)) return;
            if (target instanceof Element && target.closest('[data-create-menu-trigger]')) return;
            setCreateMenu(null);
        }

        function onKeyDown(event: KeyboardEvent) {
            if (event.key !== 'Escape' || event.defaultPrevented || event.repeat) return;
            event.preventDefault();
            setCreateMenu(null);
        }

        function onScroll() {
            setCreateMenu(null);
        }

        window.addEventListener('pointerdown', onPointerDown);
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('resize', onScroll);
        document.addEventListener('scroll', onScroll, true);

        return () => {
            window.removeEventListener('pointerdown', onPointerDown);
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('resize', onScroll);
            document.removeEventListener('scroll', onScroll, true);
        };
    }, [createMenu]);

    useEffect(() => {
        if (!actionsMenu) return;
        const firstItem = actionsMenuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]');
        firstItem?.focus();
    }, [actionsMenu]);

    useEffect(() => {
        if (!promptActionsMenu) return;
        const firstItem = promptActionsMenuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]');
        firstItem?.focus();
    }, [promptActionsMenu]);

    useEffect(() => {
        if (!createMenu) return;
        const firstItem = createMenuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]');
        firstItem?.focus();
    }, [createMenu]);

    useEffect(() => {
        selectedRowRef.current?.scrollIntoView({ block: 'nearest' });
    }, [selectedIndex]);

    useEffect(() => {
        let cancelled = false;

        listRepositories()
            .then((items) => {
                if (!cancelled) {
                    setRepositories(items);
                }
            })
            .catch(() => {
                // Project names are optional display; session list still works.
            });

        return () => {
            cancelled = true;
        };
    }, []);

    const loadQuickPrompts = useCallback(async () => {
        setQuickPromptsLoading(true);
        try {
            const items = await listQuickPrompts();
            setQuickPrompts(items);
            pruneMissingQuickPromptTabs(items.map((item) => item.id));
        } catch {
            setQuickPrompts([]);
        } finally {
            setQuickPromptsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!listVisible || listMode !== 'quickPrompts') return;
        let cancelled = false;
        setQuickPromptsLoading(true);
        listQuickPrompts()
            .then((items) => {
                if (!cancelled) {
                    setQuickPrompts(items);
                    pruneMissingQuickPromptTabs(items.map((item) => item.id));
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setQuickPrompts([]);
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setQuickPromptsLoading(false);
                }
            });
        return () => {
            cancelled = true;
        };
    }, [listVisible, listMode]);

    useEffect(() => {
        function onQuickPromptsChanged() {
            if (listMode === 'quickPrompts' && listVisible) {
                void loadQuickPrompts();
            }
        }
        window.addEventListener(QUICK_PROMPTS_CHANGED_EVENT, onQuickPromptsChanged);
        return () => window.removeEventListener(QUICK_PROMPTS_CHANGED_EVENT, onQuickPromptsChanged);
    }, [listMode, listVisible, loadQuickPrompts]);
    useEffect(() => {
        if (!promptActionsMenu) return;
        if (!quickPrompts.some((prompt) => prompt.id === promptActionsMenu.prompt.id)) {
            setPromptActionsMenu(null);
        }
    }, [promptActionsMenu, quickPrompts]);

    useEffect(() => {
        if (!promptActionsMenu) return;

        function onPointerDown(event: PointerEvent) {
            const target = event.target as Node | null;
            if (!target) return;
            if (promptActionsMenuRef.current?.contains(target)) return;
            if (target instanceof Element && target.closest('[data-quick-prompt-actions-trigger]')) return;
            setPromptActionsMenu(null);
        }

        function onKeyDown(event: KeyboardEvent) {
            if (event.key !== 'Escape' || event.defaultPrevented || event.repeat) return;
            event.preventDefault();
            setPromptActionsMenu(null);
        }

        function onScroll() {
            setPromptActionsMenu(null);
        }

        window.addEventListener('pointerdown', onPointerDown);
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('resize', onScroll);
        document.addEventListener('scroll', onScroll, true);

        return () => {
            window.removeEventListener('pointerdown', onPointerDown);
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('resize', onScroll);
            document.removeEventListener('scroll', onScroll, true);
        };
    }, [promptActionsMenu]);

    async function confirmDelete() {
        const session = pendingDelete;
        if (!session || deletingId) return;

        setDeletingId(session.id);
        setPendingDelete(null);
        removeSession(session.id);

        const fallback = closeSessionEditorTab(session.id);
        if (activeSessionId === session.id) {
            navigate(fallback ? pathForEditorTab(fallback) : '/', { replace: true });
        }

        try {
            await deleteSession(session.id);
        } catch (err: unknown) {
            upsertSession(session);
            showToast('generic-error', err instanceof Error ? err.message : intl.formatMessage(messages.deleteFailed));
        } finally {
            setDeletingId(null);
        }
    }

    async function confirmDeletePrompt() {
        const prompt = pendingDeletePrompt;
        if (!prompt || deletingPromptId) return;

        setDeletingPromptId(prompt.id);
        setPendingDeletePrompt(null);
        setQuickPrompts((current) => current.filter((item) => item.id !== prompt.id));

        const fallback = closeQuickPromptEditorTab(prompt.id);
        if (activeQuickPromptId === prompt.id) {
            navigate(fallback ? pathForEditorTab(fallback) : '/', { replace: true });
        }

        try {
            await deleteQuickPrompt(prompt.id);
        } catch (err: unknown) {
            void loadQuickPrompts();
            showToast(
                'generic-error',
                err instanceof Error ? err.message : intl.formatMessage(messages.deleteQuickPromptFailed),
            );
        } finally {
            setDeletingPromptId(null);
        }
    }

    async function handleRestart(session: Session) {
        if (restartingId || session.status !== 'error') return;

        setRestartingId(session.id);
        upsertSessionStatus({
            sessionId: session.id,
            name: session.name,
            status: 'busy',
        });

        try {
            const updated = await restartSession(session.id);
            upsertSession(updated);
        } catch (err: unknown) {
            upsertSessionStatus({
                sessionId: session.id,
                name: session.name,
                status: 'error',
            });
            showToast('generic-error', err instanceof Error ? err.message : intl.formatMessage(messages.restartFailed));
        } finally {
            setRestartingId(null);
        }
    }

    const showEmpty = !sessionsLoading && sessions.length === 0;
    const showNoMatches = !sessionsLoading && sessions.length > 0 && filteredSessions.length === 0;
    const bodyClass = showEmpty || sessionsLoading || showNoMatches ? styles.bodyEmpty : styles.body;
    const newSessionLabel = intl.formatMessage(messages.newSession);
    const createLabel = intl.formatMessage(messages.create);
    const settingsLabel = intl.formatMessage(messages.settings);
    const sessionListLabel = intl.formatMessage(messages.sessionList);
    const quickPromptListLabel = intl.formatMessage(messages.quickPromptList);
    const sessionsHeading = intl.formatMessage(messages.sessionsHeading);
    const quickPromptsHeading = intl.formatMessage(messages.quickPromptsHeading);
    const promptSearchNormalized = promptSearchQuery.trim().toLowerCase();
    const showPromptEmpty = !quickPromptsLoading && quickPrompts.length === 0 && !promptSearchNormalized;
    const showPromptNoMatches = !quickPromptsLoading && quickPrompts.length > 0 && filteredQuickPrompts.length === 0;
    const promptBodyClass =
        showPromptEmpty || quickPromptsLoading || showPromptNoMatches ? styles.bodyEmpty : styles.body;

    const sessionList = (
        <div className={styles.sessionsSection}>
            <div className={styles.search}>
                <div className={styles.searchField}>
                    <input
                        ref={searchInputRef}
                        className={styles.searchInput}
                        type='search'
                        value={searchQuery}
                        placeholder={intl.formatMessage(messages.searchPlaceholder)}
                        aria-label={intl.formatMessage(messages.searchAriaLabel)}
                        disabled={sessionsLoading || !listVisible}
                        tabIndex={!listVisible ? -1 : undefined}
                        onChange={(event) => {
                            setSearchQuery(event.target.value);
                            setSelectedIndex(null);
                        }}
                        onKeyDown={(event) => {
                            if (event.key !== 'Escape') return;
                            event.preventDefault();
                            if (searchQuery) {
                                setSearchQuery('');
                                setSelectedIndex(null);
                                return;
                            }
                            event.currentTarget.blur();
                        }}
                    />
                    {searchQuery ? (
                        <Tooltip content={intl.formatMessage(messages.clearSearch)}>
                            <button
                                type='button'
                                className={styles.searchClear}
                                aria-label={intl.formatMessage(messages.clearSearch)}
                                tabIndex={!listVisible ? -1 : undefined}
                                onClick={() => {
                                    setSearchQuery('');
                                    setSelectedIndex(null);
                                    searchInputRef.current?.focus();
                                }}
                            >
                                <ClearSearchIcon />
                            </button>
                        </Tooltip>
                    ) : null}
                </div>
            </div>

            {!isDesktop ? <p className={styles.sectionLabel}>{sessionsHeading}</p> : null}

            <div className={bodyClass}>
                {sessionsLoading ? (
                    <p className={styles.placeholder}>{intl.formatMessage(messages.loadingSessions)}</p>
                ) : null}
                {showEmpty ? <p className={styles.placeholder}>{intl.formatMessage(messages.noSessionsYet)}</p> : null}
                {showNoMatches ? (
                    <p className={styles.placeholder}>{intl.formatMessage(messages.noMatchingSessions)}</p>
                ) : null}
                {!sessionsLoading
                    ? filteredSessions.map((session, index) => {
                          const isActive = session.id === activeSessionId;
                          const isSelected = index === selectedIndex;
                          const isInitializing = session.status === 'initializing';
                          return (
                              <div key={session.id} ref={isSelected ? selectedRowRef : null}>
                                  <div className={styles.sessionRow}>
                                      <button
                                          type='button'
                                          className={sessionButtonClass(isActive, isSelected)}
                                          tabIndex={!listVisible ? -1 : undefined}
                                          onClick={() => {
                                              openSessionTab(session.id, session.name);
                                          }}
                                      >
                                          <span className={styles.sessionTitle}>{session.name}</span>
                                          {session.type === 'coding' ? (
                                              <p className={styles.sessionMeta}>
                                                  <span className={styles.sessionMetaRepo}>
                                                      {projectNames.get(session.repositoryId ?? '') ??
                                                          session.repositoryId}
                                                  </span>
                                                  {' > '}
                                                  {intl.formatMessage(messages.branchLabel, {
                                                      branch: session.branch ?? '',
                                                  })}
                                              </p>
                                          ) : (
                                              <p className={styles.sessionMetaMuted}>
                                                  {intl.formatMessage(messages.conversationSession)}
                                              </p>
                                          )}
                                          {session.cpuPercent != null || session.ramPercent != null ? (
                                              <p className={styles.usageRow}>
                                                  {session.cpuPercent != null ? (
                                                      <span className={usageClassName(session.cpuPercent)}>
                                                          {intl.formatMessage(messages.cpuLabel, {
                                                              percent: session.cpuPercent,
                                                          })}
                                                      </span>
                                                  ) : null}
                                                  {session.ramPercent != null ? (
                                                      <span className={usageClassName(session.ramPercent)}>
                                                          {intl.formatMessage(messages.ramLabel, {
                                                              percent: session.ramPercent,
                                                          })}
                                                      </span>
                                                  ) : null}
                                              </p>
                                          ) : null}
                                      </button>
                                      <div className={styles.trailing}>
                                          {session.status === 'error' ? (
                                              <Tooltip content={intl.formatMessage(messages.restartSession)}>
                                                  <button
                                                      type='button'
                                                      className={styles.restartButton}
                                                      aria-label={intl.formatMessage(messages.restartSession)}
                                                      disabled={restartingId === session.id}
                                                      tabIndex={!listVisible ? -1 : undefined}
                                                      onClick={(event) => {
                                                          event.preventDefault();
                                                          event.stopPropagation();
                                                          void handleRestart(session);
                                                      }}
                                                  >
                                                      <RestartIcon />
                                                  </button>
                                              </Tooltip>
                                          ) : null}
                                          {isInitializing ? (
                                              <Spinner
                                                  size='sm'
                                                  label={intl.formatMessage(messages.initializing)}
                                                  className={styles.initializingSpinner}
                                              />
                                          ) : (
                                              <span
                                                  className={`${styles.indicator} ${indicatorClass(session.status)}`}
                                                  aria-hidden='true'
                                              />
                                          )}
                                      </div>
                                      <div className={styles.moreActions}>
                                          <Tooltip content={intl.formatMessage(messages.sessionActions)}>
                                              <button
                                                  type='button'
                                                  data-session-actions-trigger={session.id}
                                                  className={
                                                      actionsMenu?.session.id === session.id
                                                          ? styles.moreButtonOpen
                                                          : styles.moreButton
                                                  }
                                                  aria-label={intl.formatMessage(messages.sessionActions)}
                                                  aria-haspopup='menu'
                                                  aria-expanded={actionsMenu?.session.id === session.id}
                                                  disabled={deletingId === session.id}
                                                  tabIndex={!listVisible ? -1 : undefined}
                                                  onClick={(event) => {
                                                      event.preventDefault();
                                                      event.stopPropagation();
                                                      if (actionsMenu?.session.id === session.id) {
                                                          closeActionsMenu();
                                                          return;
                                                      }
                                                      openActionsMenu(session, event.currentTarget);
                                                  }}
                                              >
                                                  <MoreIcon />
                                              </button>
                                          </Tooltip>
                                      </div>
                                  </div>
                              </div>
                          );
                      })
                    : null}
            </div>
        </div>
    );

    const quickPromptList = (
        <div className={styles.sessionsSection}>
            <div className={styles.search}>
                <div className={styles.searchField}>
                    <input
                        ref={promptSearchInputRef}
                        className={styles.searchInput}
                        type='search'
                        value={promptSearchQuery}
                        placeholder={intl.formatMessage(messages.searchQuickPromptsPlaceholder)}
                        aria-label={intl.formatMessage(messages.searchQuickPromptsAriaLabel)}
                        disabled={quickPromptsLoading || !listVisible}
                        tabIndex={!listVisible ? -1 : undefined}
                        onChange={(event) => {
                            setPromptSearchQuery(event.target.value);
                        }}
                        onKeyDown={(event) => {
                            if (event.key !== 'Escape') return;
                            event.preventDefault();
                            if (promptSearchQuery) {
                                setPromptSearchQuery('');
                                return;
                            }
                            event.currentTarget.blur();
                        }}
                    />
                    {promptSearchQuery ? (
                        <Tooltip content={intl.formatMessage(messages.clearSearch)}>
                            <button
                                type='button'
                                className={styles.searchClear}
                                aria-label={intl.formatMessage(messages.clearSearch)}
                                tabIndex={!listVisible ? -1 : undefined}
                                onClick={() => {
                                    setPromptSearchQuery('');
                                    promptSearchInputRef.current?.focus();
                                }}
                            >
                                <ClearSearchIcon />
                            </button>
                        </Tooltip>
                    ) : null}
                </div>
            </div>

            {!isDesktop ? <p className={styles.sectionLabel}>{quickPromptsHeading}</p> : null}

            <div className={promptBodyClass}>
                {quickPromptsLoading ? (
                    <p className={styles.placeholder}>{intl.formatMessage(messages.loadingQuickPrompts)}</p>
                ) : null}
                {showPromptEmpty ? (
                    <p className={styles.placeholder}>{intl.formatMessage(messages.noQuickPrompts)}</p>
                ) : null}
                {showPromptNoMatches ? (
                    <p className={styles.placeholder}>{intl.formatMessage(messages.noMatchingQuickPrompts)}</p>
                ) : null}
                {!quickPromptsLoading
                    ? filteredQuickPrompts.map((prompt) => {
                          const isActive = prompt.id === activeQuickPromptId;
                          return (
                              <div key={prompt.id}>
                                  <div className={styles.sessionRow}>
                                      <button
                                          type='button'
                                          className={sessionButtonClass(isActive, false)}
                                          tabIndex={!listVisible ? -1 : undefined}
                                          onClick={() => {
                                              openQuickPromptTab(prompt.id, prompt.name);
                                          }}
                                      >
                                          <span className={styles.sessionTitle}>{prompt.name}</span>
                                          {prompt.description ? (
                                              <p className={styles.sessionMetaMuted}>{prompt.description}</p>
                                          ) : null}
                                      </button>
                                      <div className={styles.moreActions}>
                                          <Tooltip content={intl.formatMessage(messages.quickPromptActions)}>
                                              <button
                                                  type='button'
                                                  data-quick-prompt-actions-trigger={prompt.id}
                                                  className={
                                                      promptActionsMenu?.prompt.id === prompt.id
                                                          ? styles.moreButtonOpen
                                                          : styles.moreButton
                                                  }
                                                  aria-label={intl.formatMessage(messages.quickPromptActions)}
                                                  aria-haspopup='menu'
                                                  aria-expanded={promptActionsMenu?.prompt.id === prompt.id}
                                                  disabled={deletingPromptId === prompt.id}
                                                  tabIndex={!listVisible ? -1 : undefined}
                                                  onClick={(event) => {
                                                      event.preventDefault();
                                                      event.stopPropagation();
                                                      if (promptActionsMenu?.prompt.id === prompt.id) {
                                                          closePromptActionsMenu();
                                                          return;
                                                      }
                                                      openPromptActionsMenu(prompt, event.currentTarget);
                                                  }}
                                              >
                                                  <MoreIcon />
                                              </button>
                                          </Tooltip>
                                      </div>
                                  </div>
                              </div>
                          );
                      })
                    : null}
            </div>
        </div>
    );

    const dialogs = (
        <>
            {createMenu
                ? createPortal(
                      <div
                          ref={createMenuRef}
                          className={styles.actionsMenu}
                          style={{ top: createMenu.top, left: createMenu.left }}
                          role='menu'
                          aria-label={intl.formatMessage(messages.createMenu)}
                      >
                          <button
                              type='button'
                              role='menuitem'
                              className={styles.actionsMenuItem}
                              onClick={openNewSession}
                          >
                              {intl.formatMessage(messages.createSession)}
                          </button>
                          <button
                              type='button'
                              role='menuitem'
                              className={styles.actionsMenuItem}
                              onClick={openNewTerminal}
                          >
                              {intl.formatMessage(messages.createTerminal)}
                          </button>
                          <button
                              type='button'
                              role='menuitem'
                              className={styles.actionsMenuItem}
                              onClick={openNewQuickPrompt}
                          >
                              {intl.formatMessage(messages.createQuickPrompt)}
                          </button>
                      </div>,
                      document.body,
                  )
                : null}

            {actionsMenu ? (
                <div
                    ref={actionsMenuRef}
                    className={styles.actionsMenu}
                    style={{ top: actionsMenu.top, right: actionsMenu.right }}
                    role='menu'
                    aria-label={intl.formatMessage(messages.sessionActions)}
                >
                    <button
                        type='button'
                        role='menuitem'
                        className={styles.actionsMenuItemDanger}
                        onClick={() => {
                            const session = actionsMenu.session;
                            closeActionsMenu();
                            setPendingDelete(session);
                        }}
                    >
                        {intl.formatMessage(messages.deleteSession)}
                    </button>
                </div>
            ) : null}

            {promptActionsMenu ? (
                <div
                    ref={promptActionsMenuRef}
                    className={styles.actionsMenu}
                    style={{ top: promptActionsMenu.top, right: promptActionsMenu.right }}
                    role='menu'
                    aria-label={intl.formatMessage(messages.quickPromptActions)}
                >
                    <button
                        type='button'
                        role='menuitem'
                        className={styles.actionsMenuItemDanger}
                        onClick={() => {
                            const prompt = promptActionsMenu.prompt;
                            closePromptActionsMenu();
                            setPendingDeletePrompt(prompt);
                        }}
                    >
                        {intl.formatMessage(messages.deleteQuickPrompt)}
                    </button>
                </div>
            ) : null}

            {pendingDelete ? (
                <ConfirmDialog
                    message={intl.formatMessage(messages.deleteConfirm, { name: pendingDelete.name })}
                    cancelLabel={intl.formatMessage(messages.deleteConfirmCancel)}
                    confirmLabel={intl.formatMessage(messages.deleteConfirmContinue)}
                    busy={deletingId === pendingDelete.id}
                    onCancel={() => setPendingDelete(null)}
                    onConfirm={() => {
                        void confirmDelete();
                    }}
                />
            ) : null}

            {pendingDeletePrompt ? (
                <ConfirmDialog
                    message={intl.formatMessage(messages.deleteQuickPromptConfirm, {
                        name: pendingDeletePrompt.name,
                    })}
                    cancelLabel={intl.formatMessage(messages.deleteConfirmCancel)}
                    confirmLabel={intl.formatMessage(messages.deleteConfirmContinue)}
                    busy={deletingPromptId === pendingDeletePrompt.id}
                    onCancel={() => setPendingDeletePrompt(null)}
                    onConfirm={() => {
                        void confirmDeletePrompt();
                    }}
                />
            ) : null}
        </>
    );

    return (
        <Fragment>
            {isDesktop ? (
                <div className={styles.railWrap}>
                    <Panel className={styles.panel} aria-label={intl.formatMessage(messages.logo)}>
                        <div className={styles.railBody}>
                            <Tooltip content={createLabel} disabled={Boolean(createMenu)}>
                                <button
                                    type='button'
                                    className={createMenu ? styles.railIconActive : styles.railIcon}
                                    aria-label={createLabel}
                                    aria-haspopup='menu'
                                    aria-expanded={Boolean(createMenu)}
                                    data-create-menu-trigger=''
                                    onClick={(event) => {
                                        if (createMenu) {
                                            closeCreateMenu();
                                            return;
                                        }
                                        openCreateMenu(event.currentTarget);
                                    }}
                                >
                                    <PlusIcon />
                                </button>
                            </Tooltip>
                            <Tooltip content={sessionListLabel}>
                                <button
                                    type='button'
                                    className={sessionsListActive ? styles.railIconActive : styles.railIcon}
                                    aria-label={sessionListLabel}
                                    aria-pressed={sessionsListActive}
                                    onClick={toggleSessionList}
                                >
                                    <ListIcon />
                                </button>
                            </Tooltip>
                            <Tooltip content={quickPromptListLabel}>
                                <button
                                    type='button'
                                    className={quickPromptsListActive ? styles.railIconActive : styles.railIcon}
                                    aria-label={quickPromptListLabel}
                                    aria-pressed={quickPromptsListActive}
                                    onClick={toggleQuickPromptList}
                                >
                                    <QuickPromptListIcon />
                                </button>
                            </Tooltip>
                            <div className={styles.railSpacer} />
                            <div className={styles.settingsRail}>
                                <Tooltip content={settingsLabel}>
                                    <button
                                        type='button'
                                        className={styles.railIcon}
                                        aria-label={settingsLabel}
                                        onClick={openSettings}
                                    >
                                        <SettingsIcon />
                                    </button>
                                </Tooltip>
                            </div>
                        </div>
                        {dialogs}
                    </Panel>
                </div>
            ) : null}

            {isDesktop ? <div className={styles.railGap} aria-hidden='true' /> : null}

            <div
                className={listVisible ? styles.listWrap : styles.listWrapHidden}
                aria-hidden={!listVisible || undefined}
                inert={!listVisible ? true : undefined}
            >
                <Panel
                    className={styles.panel}
                    aria-label={listMode === 'quickPrompts' ? quickPromptsHeading : sessionsHeading}
                >
                    <div className={styles.mainStack}>
                        {!isDesktop ? (
                            <button type='button' className={styles.inlineButton} onClick={openNewSession}>
                                <span className={styles.inlineButtonIcon}>
                                    <PlusIcon className={styles.settingsIcon} />
                                </span>
                                <span className={styles.inlineButtonLabel}>{newSessionLabel}</span>
                            </button>
                        ) : null}

                        {listMode === 'quickPrompts' ? quickPromptList : sessionList}

                        {!isDesktop ? (
                            <div className={styles.settings}>
                                <button type='button' className={styles.settingsButton} onClick={openSettings}>
                                    <span className={styles.inlineButtonIcon}>
                                        <SettingsIcon />
                                    </span>
                                    <span className={styles.inlineButtonLabel}>{settingsLabel}</span>
                                </button>
                            </div>
                        ) : null}
                    </div>

                    {!isDesktop ? dialogs : null}
                </Panel>
            </div>
        </Fragment>
    );
}
