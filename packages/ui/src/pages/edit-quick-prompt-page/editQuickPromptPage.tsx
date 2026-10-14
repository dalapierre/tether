import { Spinner } from '@ui/components/spinner';
import { ApiError } from '@ui/libs/api/client';
import { getQuickPrompt, type QuickPrompt } from '@ui/libs/api/quickPrompts';
import {
    closeQuickPromptEditorTab,
    createQuickPromptTab,
    openEditorTab,
    pathForEditorTab,
    useEditorTabNavigation,
} from '@ui/modules/editor-tabs';
import { NewQuickPrompt } from '@ui/modules/new-quick-prompt';
import { showToast } from '@ui/modules/toast';
import { useCallback, useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { useNavigate, useParams } from 'react-router-dom';
import { messages } from './editQuickPromptPage.messages';
import { styles } from './editQuickPromptPage.styles';

export function EditQuickPromptPage() {
    const intl = useIntl();
    const navigate = useNavigate();
    const { promptId = '' } = useParams<{ promptId: string }>();
    const { closeTab } = useEditorTabNavigation();
    const [prompt, setPrompt] = useState<QuickPrompt | null>(null);
    const [loading, setLoading] = useState(true);

    const onClose = useCallback(
        (options?: { force?: boolean }) => {
            closeTab(`quick-prompt:${promptId}`, options?.force ? { force: true } : undefined);
        },
        [closeTab, promptId],
    );

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setPrompt(null);

        getQuickPrompt(promptId)
            .then((item) => {
                if (cancelled) return;
                setPrompt(item);
                openEditorTab(createQuickPromptTab(item.id, item.name));
            })
            .catch((err: unknown) => {
                if (cancelled) return;
                const notFound = err instanceof ApiError && err.status === 404;
                showToast(
                    'generic-error',
                    notFound
                        ? intl.formatMessage(messages.notFound)
                        : err instanceof Error
                          ? err.message
                          : intl.formatMessage(messages.loadFailed),
                );
                const fallback = closeQuickPromptEditorTab(promptId);
                navigate(fallback ? pathForEditorTab(fallback) : '/', { replace: true });
            })
            .finally(() => {
                if (!cancelled) {
                    setLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [intl, navigate, promptId]);

    if (loading || !prompt) {
        return (
            <main className={styles.main}>
                <div className={styles.loading}>
                    <Spinner size='lg' label={intl.formatMessage(messages.loading)} />
                </div>
            </main>
        );
    }

    return (
        <main className={styles.main}>
            <NewQuickPrompt prompt={prompt} onClose={onClose} />
        </main>
    );
}
