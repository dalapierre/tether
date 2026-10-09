import { useIsDesktop } from '@client/libs/dom/useMediaQuery';
import { SessionsPanel } from '@client/modules/sessions-panel';
import { SettingsProvider } from '@client/modules/settings';
import { SessionEventsProvider } from '@client/modules/session-events';
import { Outlet, useLocation } from 'react-router-dom';
import { styles } from './appShell.styles';

function isMainContentRoute(pathname: string): boolean {
    return pathname.startsWith('/sessions/') || pathname === '/settings' || pathname === '/new-session';
}

export function AppShell() {
    const location = useLocation();
    const isDesktop = useIsDesktop();
    const showMainContent = isMainContentRoute(location.pathname);
    const showPanel = isDesktop || !showMainContent;
    const showMain = isDesktop || showMainContent;

    return (
        <SettingsProvider>
            <SessionEventsProvider>
                <div className={styles.root}>
                    <div className={styles.body}>
                        <div className={showPanel ? styles.panel : styles.panelHidden}>
                            <SessionsPanel listInteractive={!showMainContent} />
                        </div>
                        <div className={showMain ? styles.main : styles.mainHidden}>
                            <Outlet />
                        </div>
                    </div>
                </div>
            </SessionEventsProvider>
        </SettingsProvider>
    );
}
