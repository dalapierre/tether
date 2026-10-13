import { PanelResizeHandle, panelResizeHandleMessages } from '@ui/components/panel-resize-handle';
import { useIsDesktop } from '@ui/libs/dom/useMediaQuery';
import {
    clampSessionsPanelWidthPx,
    getSessionsListOpen,
    getSessionsPanelWidthPx,
    setSessionsListOpen,
    setSessionsPanelWidthPx,
    SESSIONS_RAIL_WIDTH_PX,
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
    const showMobileList = !isDesktop && !showMainContent;
    const showSessionsChrome = isDesktop || showMobileList;
    const showMain = isDesktop || showMainContent;

    const [panelWidth, setPanelWidth] = useState(getSessionsPanelWidthPx);
    const [sessionListOpen, setSessionListOpenState] = useState(() => getSessionsListOpen());
    const [animateLayout, setAnimateLayout] = useState(false);
    const panelWidthRef = useRef(panelWidth);
    panelWidthRef.current = panelWidth;

    const persistPanelWidth = useCallback(() => {
        setSessionsPanelWidthPx(panelWidthRef.current);
    }, []);

    const setSessionListOpen = useCallback((open: boolean) => {
        setAnimateLayout(true);
        setSessionListOpenState(open);
        setSessionsListOpen(open);
    }, []);

    const bodyStyle =
        isDesktop && showSessionsChrome
            ? {
                  gridTemplateColumns: sessionListOpen
                      ? `${SESSIONS_RAIL_WIDTH_PX}px auto ${panelWidth}px auto minmax(0, 1fr)`
                      : `${SESSIONS_RAIL_WIDTH_PX}px auto 0px 0px minmax(0, 1fr)`,
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
                        {showSessionsChrome ? (
                            <SessionsPanel
                                listInteractive={!showMainContent}
                                sessionListOpen={sessionListOpen}
                                onSessionListOpenChange={setSessionListOpen}
                            />
                        ) : null}
                        {isDesktop ? (
                            sessionListOpen ? (
                                <PanelResizeHandle
                                    placement='gap'
                                    ariaLabel={intl.formatMessage(panelResizeHandleMessages.resizeSessionsPanel)}
                                    onResize={(delta) => {
                                        setAnimateLayout(false);
                                        setPanelWidth((width) => clampSessionsPanelWidthPx(width + delta));
                                    }}
                                    onResizeEnd={persistPanelWidth}
                                />
                            ) : (
                                <div className={styles.resizeSpacer} aria-hidden='true' />
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
