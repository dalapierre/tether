import { DEFAULT_KEYBINDS, KeybindsContext, cloneKeybinds, type Keybinds } from '@client/libs/keybinds';
import { getSettings } from '@client/libs/api/settings';
import { setToastDurationSeconds } from '@client/modules/toast';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Settings } from './settings';
import { SettingsContext } from './settingsContext';

export function SettingsProvider({ children }: { children: ReactNode }) {
    const [open, setOpen] = useState(false);
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

    const settingsValue = useMemo(() => ({ openSettings: () => setOpen(true) }), []);
    const keybindsValue = useMemo(() => ({ keybinds, setKeybinds }), [keybinds]);

    return (
        <SettingsContext.Provider value={settingsValue}>
            <KeybindsContext.Provider value={keybindsValue}>
                {children}
                {open ? (
                    <Settings
                        onClose={() => setOpen(false)}
                        onKeybindsSaved={(next) => setKeybinds(cloneKeybinds(next))}
                    />
                ) : null}
            </KeybindsContext.Provider>
        </SettingsContext.Provider>
    );
}
