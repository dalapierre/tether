import { SettingsProvider } from '@client/modules/settings';
import { SessionEventsProvider } from '@client/modules/session-events';
import { Outlet } from 'react-router-dom';
import { styles } from './appShell.styles';

export function AppShell() {
    return (
        <SettingsProvider>
            <SessionEventsProvider>
                <div className={styles.root}>
                    <div className={styles.content}>
                        <Outlet />
                    </div>
                </div>
            </SessionEventsProvider>
        </SettingsProvider>
    );
}
