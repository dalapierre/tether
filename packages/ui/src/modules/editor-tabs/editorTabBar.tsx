import { Panel } from '@ui/components/panel';
import { Tooltip } from '@ui/components/tooltip';
import { getLiveSession, getSessionsSnapshot, hasSessionsSnapshot, subscribe } from '@ui/modules/session-events';
import { Fragment, useCallback, useEffect, useSyncExternalStore, type MouseEvent } from 'react';
import { useIntl } from 'react-intl';
import { useLocation } from 'react-router-dom';
import { messages } from './editorTabs.messages';
import { styles } from './editorTabs.styles';
import {
    editorTabFromPath,
    getEditorTabsSnapshot,
    pruneMissingSessionTabs,
    subscribeEditorTabs,
} from './editorTabsStore';
import type { EditorTab, EditorTabId } from './editorTabs.types';
import { useEditorTabNavigation } from './useEditorTabNavigation';

function tabLabel(tab: EditorTab, formatMessage: ReturnType<typeof useIntl>['formatMessage']): string {
    switch (tab.kind) {
        case 'settings':
            return formatMessage(messages.settings);
        case 'new-session':
            return formatMessage(messages.newSession);
        case 'session': {
            const session = getLiveSession(tab.sessionId);
            return session?.name ?? formatMessage(messages.sessionFallback);
        }
    }
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

    useEffect(() => {
        // Wait for the live session snapshot so we don't wipe persisted session tabs on boot.
        if (!sessionsReady) return;
        pruneMissingSessionTabs(sessions.keys());
    }, [sessions, sessionsReady]);

    const onClose = useCallback(
        (event: MouseEvent, id: EditorTabId) => {
            event.preventDefault();
            event.stopPropagation();
            closeTab(id);
        },
        [closeTab],
    );

    if (tabs.length === 0) return null;

    return (
        <Panel className={styles.panel} aria-label={intl.formatMessage(messages.tabList)}>
            <div className={styles.list} role='tablist' aria-label={intl.formatMessage(messages.tabList)}>
                {tabs.map((tab, index) => {
                    const selected = tab.id === activeId;
                    const prevSelected = index > 0 && tabs[index - 1]?.id === activeId;
                    const showSeparator = index > 0 && !selected && !prevSelected;
                    const label = tabLabel(tab, intl.formatMessage);
                    const closeLabel = `${intl.formatMessage(messages.closeTab)} ${label}`;

                    return (
                        <Fragment key={tab.id}>
                            {showSeparator ? <span className={styles.separator} aria-hidden='true' /> : null}
                            <div
                                role='tab'
                                tabIndex={selected ? 0 : -1}
                                aria-selected={selected}
                                className={selected ? styles.tabActive : styles.tab}
                                onClick={() => activateTab(tab)}
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
            </div>
        </Panel>
    );
}
