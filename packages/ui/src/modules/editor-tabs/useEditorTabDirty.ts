import { useEffect, useRef } from 'react';
import {
    clearEditorTabDirty,
    registerEditorTabCloseGuard,
    setEditorTabDirty,
    type EditorTabCloseGuard,
} from './editorTabDirtyStore';
import type { EditorTabId } from './editorTabs.types';

/** Publish dirty state and close-save/discard handlers for an editor tab. */
export function useEditorTabDirty(
    tabId: EditorTabId,
    dirty: boolean,
    save: EditorTabCloseGuard['save'],
    discard?: EditorTabCloseGuard['discard'],
): void {
    const saveRef = useRef(save);
    const discardRef = useRef(discard);
    saveRef.current = save;
    discardRef.current = discard;

    useEffect(() => {
        setEditorTabDirty(tabId, dirty);
        return () => {
            clearEditorTabDirty(tabId);
        };
    }, [tabId, dirty]);

    useEffect(() => {
        return registerEditorTabCloseGuard(tabId, {
            save: () => saveRef.current(),
            discard: () => {
                discardRef.current?.();
            },
        });
    }, [tabId]);
}
