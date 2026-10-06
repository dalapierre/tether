import { useEffect, useRef } from 'react';
import { eventMatchesKeybind, isEditableTarget, isTerminalInsertTarget, keybindHasNonShiftModifier } from './chords';
import { useKeybinds } from './keybindsContext';
import type { KeybindActionForCategory, KeybindCategory } from './types';

type UseKeybindOptions = {
    enabled?: boolean;
    /** Allow firing while focus is in an input/textarea (default: only for mod/alt chords). */
    allowInEditable?: boolean;
    /** Allow firing while the agent terminal is in insert mode. */
    allowInTerminalInsert?: boolean;
    /** Fire on OS key-repeat while the key is held. */
    allowRepeat?: boolean;
};

export function useKeybind<C extends KeybindCategory>(
    category: C,
    action: KeybindActionForCategory[C],
    handler: (event: KeyboardEvent) => void,
    options: UseKeybindOptions = {},
): void {
    const { keybinds } = useKeybinds();
    const chord = keybinds[category][action as never] as string;
    const enabled = options.enabled ?? true;
    const allowInEditable = options.allowInEditable;
    const allowInTerminalInsert = options.allowInTerminalInsert ?? false;
    const allowRepeat = options.allowRepeat ?? false;
    const handlerRef = useRef(handler);
    handlerRef.current = handler;

    useEffect(() => {
        if (!enabled || !chord.trim()) return;

        function onKeyDown(event: KeyboardEvent) {
            if (event.defaultPrevented || (event.repeat && !allowRepeat)) return;
            if (document.querySelector('[aria-modal="true"]')) return;
            if (isTerminalInsertTarget(event.target) && !allowInTerminalInsert) return;
            if (!eventMatchesKeybind(event, chord)) return;

            const editable = isEditableTarget(event.target);
            const allowEditable = allowInEditable ?? keybindHasNonShiftModifier(chord);
            if (editable && !allowInTerminalInsert && !allowEditable) return;
            // Terminal insert is editable; allowInTerminalInsert opts into handling it.
            if (editable && isTerminalInsertTarget(event.target) && !allowInTerminalInsert) return;

            event.preventDefault();
            event.stopPropagation();
            handlerRef.current(event);
        }

        window.addEventListener('keydown', onKeyDown, true);
        return () => window.removeEventListener('keydown', onKeyDown, true);
    }, [allowInEditable, allowInTerminalInsert, allowRepeat, chord, enabled]);
}
