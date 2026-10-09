import { useIsDesktop } from '@client/libs/dom/useMediaQuery';
import { SessionsPanel } from '@client/modules/sessions-panel';
import { SettingsProvider } from '@client/modules/settings';
import { SessionEventsProvider } from '@client/modules/session-events';
import { Outlet, useLocation } from 'react-router-dom';
import { styles } from './appShell.styles';

export function AppShell() {
    const location = useLocation();
    const isDesktop = useIsDesktop();
    const isSessionRoute = location.pathname.startsWith('/sessions/');
    const showPanel = isDesktop || !isSessionRoute;
    const showMain = isDesktop || isSessionRoute;

    return (
        <SettingsProvider>
            <SessionEventsProvider>
                <div className={styles.root}>
                    <div className={styles.body}>
                        <div className={showPanel ? styles.panel : styles.panelHidden}>
                            <SessionsPanel listInteractive={!isSessionRoute} />
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
