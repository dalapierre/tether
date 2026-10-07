import { useEffect, useRef } from 'react';
import { eventMatchesKeybind, isEditableTarget, isTerminalInsertTarget, keybindHasNonShiftModifier } from './chords';
import { useKeybinds } from './keybindsContext';
import type { KeybindActionForCategory, KeybindCategory } from './types';

type UseKeybindOptions = {
    enabled?: boolean;
    /** Allow firing while focus is in an input/textarea (default: only for mod/alt chords). */
    allowInEditable?: boolean;
    /** Allow firing while a terminal (agent or shell) is in insert mode. */
    allowInTerminalInsert?: boolean;
    /** Only fire while a terminal (agent or shell) is in insert mode. */
    requireTerminalInsert?: boolean;
    /** Fire on OS key-repeat while the key is held. */
    allowRepeat?: boolean;
};

/** Bind a raw chord string (not looked up from settings). */
export function useKeybindChord(
    chord: string,
    handler: (event: KeyboardEvent) => void,
    options: UseKeybindOptions = {},
): void {
    const enabled = options.enabled ?? true;
    const allowInEditable = options.allowInEditable;
    const allowInTerminalInsert = options.allowInTerminalInsert ?? false;
    const requireTerminalInsert = options.requireTerminalInsert ?? false;
    const allowRepeat = options.allowRepeat ?? false;
    const handlerRef = useRef(handler);
    handlerRef.current = handler;

    useEffect(() => {
        if (!enabled || !chord.trim()) return;

        function onKeyDown(event: KeyboardEvent) {
            if (event.defaultPrevented || (event.repeat && !allowRepeat)) return;
            if (document.querySelector('[aria-modal="true"]')) return;
            const inTerminalInsert = isTerminalInsertTarget(event.target);
            if (requireTerminalInsert && !inTerminalInsert) return;
            if (inTerminalInsert && !allowInTerminalInsert && !requireTerminalInsert) return;
            if (!eventMatchesKeybind(event, chord)) return;

            const editable = isEditableTarget(event.target);
            const allowEditable = allowInEditable ?? keybindHasNonShiftModifier(chord);
            if (editable && !inTerminalInsert && !allowEditable) return;
            // Terminal insert is editable; allowInTerminalInsert / requireTerminalInsert opt in.
            if (editable && inTerminalInsert && !allowInTerminalInsert && !requireTerminalInsert) return;

            event.preventDefault();
            event.stopPropagation();
            handlerRef.current(event);
        }

        window.addEventListener('keydown', onKeyDown, true);
        return () => window.removeEventListener('keydown', onKeyDown, true);
    }, [allowInEditable, allowInTerminalInsert, allowRepeat, chord, enabled, requireTerminalInsert]);
}

export function useKeybind<C extends KeybindCategory>(
    category: C,
    action: KeybindActionForCategory[C],
    handler: (event: KeyboardEvent) => void,
    options: UseKeybindOptions = {},
): void {
    const { keybinds } = useKeybinds();
    const chord = keybinds[category][action as never] as string;
    useKeybindChord(chord, handler, options);
}
