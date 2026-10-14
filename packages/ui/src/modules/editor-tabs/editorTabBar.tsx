import { Panel } from '@ui/components/panel';
import { Tooltip } from '@ui/components/tooltip';
import { getLiveSession, getSessionsSnapshot, hasSessionsSnapshot, subscribe } from '@ui/modules/session-events';
import {
    Fragment,
    useCallback,
    useEffect,
    useRef,
    useState,
    useSyncExternalStore,
    type MouseEvent,
    type PointerEvent as ReactPointerEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { useIntl } from 'react-intl';
import { useLocation } from 'react-router-dom';
import { messages } from './editorTabs.messages';
import { styles } from './editorTabs.styles';
import {
    editorTabFromPath,
    getEditorTabsSnapshot,
    pruneMissingSessionTabs,
    setEditorTabsOrder,
    subscribeEditorTabs,
    syncSessionTabTitles,
} from './editorTabsStore';
import type { EditorTab, EditorTabId } from './editorTabs.types';
import { useEditorTabNavigation } from './useEditorTabNavigation';

const DRAG_THRESHOLD_PX = 4;

type DragGhost = {
    id: EditorTabId;
    label: string;
    selected: boolean;
    width: number;
    height: number;
    offsetX: number;
    offsetY: number;
    x: number;
    y: number;
};

function tabLabel(tab: EditorTab, formatMessage: ReturnType<typeof useIntl>['formatMessage']): string {
    switch (tab.kind) {
        case 'settings':
            return formatMessage(messages.settings);
        case 'new-session':
            return formatMessage(messages.newSession);
        case 'new-quick-prompt':
            return formatMessage(messages.newQuickPrompt);
        case 'quick-prompt':
            return tab.title ?? formatMessage(messages.quickPromptFallback);
        case 'session': {
            const session = getLiveSession(tab.sessionId);
            return session?.name ?? tab.title ?? formatMessage(messages.sessionFallback);
        }
        case 'terminal':
            return tab.title ?? formatMessage(messages.terminalFallback);
    }
}

/** Insert index in `order` for a drop at `clientX` (0..length), ignoring the dragged tab's box. */
function dropIndexAtClientX(order: EditorTab[], draggedId: EditorTabId, clientX: number, list: HTMLElement): number {
    const nodes = [...list.querySelectorAll<HTMLElement>('[data-editor-tab-id]')].filter(
        (node) => node.dataset.editorTabId !== draggedId,
    );

    if (nodes.length === 0) {
        const from = order.findIndex((tab) => tab.id === draggedId);
        return from === -1 ? order.length : from;
    }

    for (const node of nodes) {
        const id = node.dataset.editorTabId as EditorTabId | undefined;
        if (!id) continue;
        const rect = node.getBoundingClientRect();
        if (clientX < rect.left + rect.width / 2) {
            const index = order.findIndex((tab) => tab.id === id);
            return index === -1 ? order.length : index;
        }
    }

    // After the last remaining tab: append, accounting for the dragged tab's removal.
    return order.length;
}

function orderWithDrop(order: EditorTab[], draggedId: EditorTabId, dropIndex: number): EditorTab[] {
    const from = order.findIndex((tab) => tab.id === draggedId);
    if (from === -1) return order;

    const next = [...order];
    const [item] = next.splice(from, 1);
    if (!item) return order;

    let insertAt = dropIndex;
    if (dropIndex > from) insertAt = dropIndex - 1;
    insertAt = Math.max(0, Math.min(insertAt, next.length));
    next.splice(insertAt, 0, item);
    return next;
}

export function EditorTabBar() {
    const intl = useIntl();
    const location = useLocation();
    const { activateTab, closeTab } = useEditorTabNavigation();
    const tabs = useSyncExternalStore(subscribeEditorTabs, getEditorTabsSnapshot, getEditorTabsSnapshot);
    const sessions = useSyncExternalStore(subscribe, getSessionsSnapshot, getSessionsSnapshot);
    const sessionsReady = useSyncExternalStore(subscribe, hasSessionsSnapshot, hasSessionsSnapshot);
    const activeTab = editorTabFromPath(location.pathname);
    const activeId = activeTab?.id ?? null;

    const listRef = useRef<HTMLDivElement | null>(null);
    const dragRef = useRef<{
        id: EditorTabId;
        pointerId: number;
        startX: number;
        startY: number;
        active: boolean;
        dropIndex: number;
        offsetX: number;
        offsetY: number;
        width: number;
        height: number;
        label: string;
        selected: boolean;
    } | null>(null);
    const skipClickRef = useRef(false);
    const [ghost, setGhost] = useState<DragGhost | null>(null);
    const [dropIndex, setDropIndex] = useState<number | null>(null);

    useEffect(() => {
        // Wait for the live session snapshot so we don't wipe persisted session tabs on boot.
        if (!sessionsReady) return;
        pruneMissingSessionTabs(sessions.keys());
        const names = new Map<string, string>();
        for (const session of sessions.values()) {
            names.set(session.id, session.name);
        }
        syncSessionTabTitles(names);
    }, [sessions, sessionsReady]);

    const onClose = useCallback(
        (event: MouseEvent, id: EditorTabId) => {
            event.preventDefault();
            event.stopPropagation();
            closeTab(id);
        },
        [closeTab],
    );

    const endDrag = useCallback(() => {
        const drag = dragRef.current;
        dragRef.current = null;
        setGhost(null);
        setDropIndex(null);
        if (!drag?.active) return;

        skipClickRef.current = true;
        const next = orderWithDrop(tabs, drag.id, drag.dropIndex);
        setEditorTabsOrder(next);
    }, [tabs]);

    const onTabPointerDown = useCallback(
        (event: ReactPointerEvent<HTMLDivElement>, tab: EditorTab, label: string, selected: boolean) => {
            if (event.button !== 0) return;
            // Close control handles its own pointer interaction.
            if ((event.target as HTMLElement | null)?.closest('button')) return;

            const rect = event.currentTarget.getBoundingClientRect();
            dragRef.current = {
                id: tab.id,
                pointerId: event.pointerId,
                startX: event.clientX,
                startY: event.clientY,
                active: false,
                dropIndex: tabs.findIndex((item) => item.id === tab.id),
                offsetX: event.clientX - rect.left,
                offsetY: event.clientY - rect.top,
                width: rect.width,
                height: rect.height,
                label,
                selected,
            };
            event.currentTarget.setPointerCapture(event.pointerId);
        },
        [tabs],
    );

    const onTabPointerMove = useCallback(
        (event: ReactPointerEvent<HTMLDivElement>) => {
            const drag = dragRef.current;
            if (!drag || drag.pointerId !== event.pointerId) return;

            if (!drag.active) {
                const moved =
                    Math.abs(event.clientX - drag.startX) >= DRAG_THRESHOLD_PX ||
                    Math.abs(event.clientY - drag.startY) >= DRAG_THRESHOLD_PX;
                if (!moved) return;
                drag.active = true;
                setGhost({
                    id: drag.id,
                    label: drag.label,
                    selected: drag.selected,
                    width: drag.width,
                    height: drag.height,
                    offsetX: drag.offsetX,
                    offsetY: drag.offsetY,
                    x: event.clientX,
                    y: event.clientY,
                });
                setDropIndex(drag.dropIndex);
            } else {
                setGhost((current) =>
                    current
                        ? {
                              ...current,
                              x: event.clientX,
                              y: event.clientY,
                          }
                        : current,
                );
            }

            const list = listRef.current;
            if (!list) return;
            const nextDrop = dropIndexAtClientX(tabs, drag.id, event.clientX, list);
            drag.dropIndex = nextDrop;
            setDropIndex(nextDrop);
        },
        [tabs],
    );

    const onTabPointerUp = useCallback(
        (event: ReactPointerEvent<HTMLDivElement>) => {
            const drag = dragRef.current;
            if (!drag || drag.pointerId !== event.pointerId) return;
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                event.currentTarget.releasePointerCapture(event.pointerId);
            }
            endDrag();
        },
        [endDrag],
    );

    const onTabPointerCancel = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }
        dragRef.current = null;
        setGhost(null);
        setDropIndex(null);
    }, []);

    if (tabs.length === 0) return null;

    const draggingId = ghost?.id ?? null;
    const fromIndex = draggingId ? tabs.findIndex((tab) => tab.id === draggingId) : -1;

    return (
        <Panel className={styles.panel} aria-label={intl.formatMessage(messages.tabList)}>
            <div
                ref={listRef}
                className={`${styles.list}${draggingId ? ` ${styles.tabDraggingCursor}` : ''}`}
                role='tablist'
                aria-label={intl.formatMessage(messages.tabList)}
            >
                {tabs.map((tab, index) => {
                    const selected = tab.id === activeId;
                    const prevSelected = index > 0 && tabs[index - 1]?.id === activeId;
                    const dragging = draggingId === tab.id;
                    // Hide the usual separator while dragging; the drop marker replaces it.
                    const showSeparator = !draggingId && index > 0 && !selected && !prevSelected;
                    // dropIndex === from or from+1 is a no-op once the dragged tab is removed.
                    const showDropBefore =
                        dropIndex !== null &&
                        draggingId !== null &&
                        dropIndex === index &&
                        dropIndex !== fromIndex &&
                        dropIndex !== fromIndex + 1;
                    const label = tabLabel(tab, intl.formatMessage);
                    const closeLabel = `${intl.formatMessage(messages.closeTab)} ${label}`;
                    const tabClass = `${selected ? styles.tabActive : styles.tab}${dragging ? ` ${styles.tabOrigin}` : ''}`;

                    return (
                        <Fragment key={tab.id}>
                            {showDropBefore ? <span className={styles.dropMarker} aria-hidden='true' /> : null}
                            {showSeparator ? <span className={styles.separator} aria-hidden='true' /> : null}
                            <div
                                role='tab'
                                data-editor-tab-id={tab.id}
                                tabIndex={selected ? 0 : -1}
                                aria-selected={selected}
                                className={tabClass}
                                onClick={() => {
                                    if (skipClickRef.current) {
                                        skipClickRef.current = false;
                                        return;
                                    }
                                    activateTab(tab);
                                }}
                                onPointerDown={(event) => onTabPointerDown(event, tab, label, selected)}
                                onPointerMove={onTabPointerMove}
                                onPointerUp={onTabPointerUp}
                                onPointerCancel={onTabPointerCancel}
                                onMouseDown={(event) => {
                                    // Prevent the browser autoscroll cursor on middle-click.
                                    if (event.button === 1) {
                                        event.preventDefault();
                                    }
                                }}
                                onAuxClick={(event) => {
                                    if (event.button === 1) {
                                        onClose(event, tab.id);
                                    }
                                }}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault();
                                        activateTab(tab);
                                    }
                                }}
                            >
                                <Tooltip content={label}>
                                    <span className={styles.tabLabel}>{label}</span>
                                </Tooltip>
                                <Tooltip content={closeLabel}>
                                    <button
                                        type='button'
                                        className={selected ? `${styles.close} ${styles.closeVisible}` : styles.close}
                                        aria-label={closeLabel}
                                        onClick={(event) => onClose(event, tab.id)}
                                    >
                                        ×
                                    </button>
                                </Tooltip>
                            </div>
                        </Fragment>
                    );
                })}
                {dropIndex !== null &&
                draggingId !== null &&
                dropIndex === tabs.length &&
                fromIndex !== tabs.length - 1 ? (
                    <span className={styles.dropMarker} aria-hidden='true' />
                ) : null}
            </div>
            {ghost
                ? createPortal(
                      <div
                          className={`${styles.ghost}${ghost.selected ? ` ${styles.ghostActive}` : ''}`}
                          style={{
                              width: ghost.width,
                              height: ghost.height,
                              left: ghost.x - ghost.offsetX,
                              top: ghost.y - ghost.offsetY,
                          }}
                          aria-hidden='true'
                      >
                          <span className={styles.ghostLabel}>{ghost.label}</span>
                          <span className={styles.ghostClose}>×</span>
                      </div>,
                      document.body,
                  )
                : null}
        </Panel>
    );
}
