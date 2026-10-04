import { SettingsProvider } from '@client/modules/settings';
import { Outlet } from 'react-router-dom';
import { styles } from './appShell.styles';

export function AppShell() {
    return (
        <SettingsProvider>
            <div className={styles.root}>
                <div className={styles.content}>
                    <Outlet />
                </div>
            </div>
        </SettingsProvider>
    );
}
