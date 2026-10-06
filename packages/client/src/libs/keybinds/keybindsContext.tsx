import { createContext, useContext } from 'react';
import { DEFAULT_KEYBINDS, type Keybinds } from './types';

export type KeybindsContextValue = {
    keybinds: Keybinds;
    setKeybinds: (keybinds: Keybinds) => void;
};

export const KeybindsContext = createContext<KeybindsContextValue>({
    keybinds: DEFAULT_KEYBINDS,
    setKeybinds: () => {},
});

export function useKeybinds(): KeybindsContextValue {
    return useContext(KeybindsContext);
}
