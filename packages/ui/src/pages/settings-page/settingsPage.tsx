import { cloneKeybinds, useKeybinds } from '@ui/libs/keybinds';
import { getPanelReturnPath } from '@ui/libs/navigation/panelReturn';
import { Settings } from '@ui/modules/settings';
import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { styles } from './settingsPage.styles';

export function SettingsPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { setKeybinds } = useKeybinds();

    const onClose = useCallback(() => {
        navigate(getPanelReturnPath(location.state));
    }, [location.state, navigate]);

    return (
        <main className={styles.main}>
            <Settings onClose={onClose} onKeybindsSaved={(next) => setKeybinds(cloneKeybinds(next))} />
        </main>
    );
}
