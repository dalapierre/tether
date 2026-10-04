import { BottomNav } from '@client/components/bottom-nav';
import { Outlet } from 'react-router-dom';
import { styles } from './appShell.styles';

export function AppShell() {
    return (
        <div className={styles.root}>
            <div className={styles.content}>
                <Outlet />
            </div>
            <BottomNav />
        </div>
    );
}
