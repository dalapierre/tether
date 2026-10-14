import type { Keybinds } from '@ui/libs/keybinds';

export type SettingsProps = {
    /** Close the settings tab. Pass `{ force: true }` to skip the unsaved-changes prompt. */
    onClose: (options?: { force?: boolean }) => void;
    onKeybindsSaved?: (keybinds: Keybinds) => void;
};

export type SettingsContextValue = {
    openSettings: () => void;
};
