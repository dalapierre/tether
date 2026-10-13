import { cloneKeybinds, useKeybinds } from '@ui/libs/keybinds';
import { useEditorTabNavigation } from '@ui/modules/editor-tabs';
import { Settings } from '@ui/modules/settings';
import { useCallback } from 'react';
import { styles } from './settingsPage.styles';

export function SettingsPage() {
    const { setKeybinds } = useKeybinds();
    const { closeTab } = useEditorTabNavigation();

    const onClose = useCallback(() => {
        closeTab('settings');
    }, [closeTab]);

    return (
        <main className={styles.main}>
            <Settings onClose={onClose} onKeybindsSaved={(next) => setKeybinds(cloneKeybinds(next))} />
        </main>
    );
}
