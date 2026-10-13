import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ensureEditorTabForPath } from './editorTabsStore';

/** Keep the tab list in sync with the active route (deep links, first open). */
export function EditorTabsSync() {
    const location = useLocation();

    useEffect(() => {
        ensureEditorTabForPath(location.pathname);
    }, [location.pathname]);

    return null;
}
