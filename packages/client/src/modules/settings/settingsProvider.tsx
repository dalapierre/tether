import { useState, type ReactNode } from 'react';
import { Settings } from './settings';
import { SettingsContext } from './settingsContext';

export function SettingsProvider({ children }: { children: ReactNode }) {
    const [open, setOpen] = useState(false);

    return (
        <SettingsContext.Provider value={{ openSettings: () => setOpen(true) }}>
            {children}
            {open ? <Settings onClose={() => setOpen(false)} /> : null}
        </SettingsContext.Provider>
    );
}
