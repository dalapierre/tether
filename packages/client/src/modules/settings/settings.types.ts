import type { Keybinds } from '@client/libs/keybinds';

export type SettingsProps = {
    onClose: () => void;
    onKeybindsSaved?: (keybinds: Keybinds) => void;
};

export type SettingsContextValue = {
    openSettings: () => void;
};
