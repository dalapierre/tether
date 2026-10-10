import { PanelResizeHandle, panelResizeHandleMessages } from '@ui/components/panel-resize-handle';
import { useIsDesktop } from '@ui/libs/dom/useMediaQuery';
import {
    clampSessionsPanelWidthPx,
    getSessionsPanelCollapsed,
    getSessionsPanelWidthPx,
    setSessionsPanelCollapsed,
    setSessionsPanelWidthPx,
    SESSIONS_PANEL_COLLAPSED_WIDTH_PX,
} from '@ui/libs/layout/reviewLayoutPreferences';
import { SessionsPanel } from '@ui/modules/sessions-panel';
import { SettingsProvider } from '@ui/modules/settings';
import { SessionEventsProvider } from '@ui/modules/session-events';
import { useCallback, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { Outlet, useLocation } from 'react-router-dom';
import { styles } from './appShell.styles';

function isMainContentRoute(pathname: string): boolean {
    return pathname.startsWith('/sessions/') || pathname === '/settings' || pathname === '/new-session';
}

export function AppShell() {
    const intl = useIntl();
    const location = useLocation();
    const isDesktop = useIsDesktop();
    const showMainContent = isMainContentRoute(location.pathname);
    const showPanel = isDesktop || !showMainContent;
    const showMain = isDesktop || showMainContent;

    const [panelWidth, setPanelWidth] = useState(getSessionsPanelWidthPx);
    const [collapsed, setCollapsed] = useState(getSessionsPanelCollapsed);
    const [animateLayout, setAnimateLayout] = useState(false);
    const panelWidthRef = useRef(panelWidth);
    panelWidthRef.current = panelWidth;

    const effectivelyCollapsed = isDesktop && collapsed;

    const persistPanelWidth = useCallback(() => {
        setSessionsPanelWidthPx(panelWidthRef.current);
    }, []);

    const collapseSidebar = useCallback(() => {
        setAnimateLayout(true);
        setCollapsed(true);
        setSessionsPanelCollapsed(true);
    }, []);

    const expandSidebar = useCallback(() => {
        setAnimateLayout(true);
        setCollapsed(false);
        setSessionsPanelCollapsed(false);
    }, []);

    const bodyStyle =
        isDesktop && showPanel
            ? {
                  gridTemplateColumns: `${
                      effectivelyCollapsed ? SESSIONS_PANEL_COLLAPSED_WIDTH_PX : panelWidth
                  }px auto minmax(0, 1fr)`,
              }
            : undefined;

    return (
        <SettingsProvider>
            <SessionEventsProvider>
                <div className={styles.root}>
                    <div
                        className={animateLayout ? styles.bodyAnimate : styles.body}
                        style={bodyStyle}
                        onTransitionEnd={(event) => {
                            if (
                                event.target === event.currentTarget &&
                                event.propertyName === 'grid-template-columns'
                            ) {
                                setAnimateLayout(false);
                            }
                        }}
                    >
                        <div className={showPanel ? styles.panel : styles.panelHidden}>
                            <SessionsPanel
                                listInteractive={!showMainContent}
                                collapsed={effectivelyCollapsed}
                                expandedWidth={panelWidth}
                                onCollapse={collapseSidebar}
                                onExpand={expandSidebar}
                            />
                        </div>
                        {isDesktop && showPanel ? (
                            effectivelyCollapsed ? (
                                <div className={styles.resizeSpacer} aria-hidden='true' />
                            ) : (
                                <PanelResizeHandle
                                    placement='gap'
                                    ariaLabel={intl.formatMessage(panelResizeHandleMessages.resizeSessionsPanel)}
                                    onResize={(delta) => {
                                        setAnimateLayout(false);
                                        setPanelWidth((width) => clampSessionsPanelWidthPx(width + delta));
                                    }}
                                    onResizeEnd={persistPanelWidth}
                                />
                            )
                        ) : null}
                        <div className={showMain ? styles.main : styles.mainHidden}>
                            <Outlet />
                        </div>
                    </div>
                </div>
            </SessionEventsProvider>
        </SettingsProvider>
    );
}
