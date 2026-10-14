import { useEditorTabNavigation } from '@ui/modules/editor-tabs';
import { NewQuickPrompt } from '@ui/modules/new-quick-prompt';
import { useCallback } from 'react';
import { styles } from './newQuickPromptPage.styles';

export function NewQuickPromptPage() {
    const { closeTab } = useEditorTabNavigation();

    const onClose = useCallback(
        (options?: { force?: boolean }) => {
            closeTab('new-quick-prompt', options?.force ? { force: true } : undefined);
        },
        [closeTab],
    );

    return (
        <main className={styles.main}>
            <NewQuickPrompt onClose={onClose} />
        </main>
    );
}
