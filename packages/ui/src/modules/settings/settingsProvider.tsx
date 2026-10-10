import { DEFAULT_KEYBINDS, KeybindsContext, cloneKeybinds, type Keybinds } from '@ui/libs/keybinds';
import { getSettings } from '@ui/libs/api/settings';
import { panelLocationState } from '@ui/libs/navigation/panelReturn';
import { setToastDurationSeconds } from '@ui/modules/toast';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { SettingsContext } from './settingsContext';

export function SettingsProvider({ children }: { children: ReactNode }) {
    const navigate = useNavigate();
    const location = useLocation();
    const [keybinds, setKeybinds] = useState<Keybinds>(() => cloneKeybinds(DEFAULT_KEYBINDS));

    useEffect(() => {
        let cancelled = false;
        getSettings()
            .then((settings) => {
                if (!cancelled) {
                    setKeybinds(cloneKeybinds(settings.keybinds));
                    setToastDurationSeconds(settings.toastDurationSeconds);
                }
            })
            .catch(() => {
                // Keep defaults if settings fail to load.
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const settingsValue = useMemo(
        () => ({
            openSettings: () => {
                if (location.pathname === '/settings') return;
                navigate('/settings', { state: panelLocationState(location.pathname, location.search) });
            },
        }),
        [location.pathname, location.search, navigate],
    );
    const keybindsValue = useMemo(() => ({ keybinds, setKeybinds }), [keybinds]);

    return (
        <SettingsContext.Provider value={settingsValue}>
            <KeybindsContext.Provider value={keybindsValue}>{children}</KeybindsContext.Provider>
        </SettingsContext.Provider>
    );
}
