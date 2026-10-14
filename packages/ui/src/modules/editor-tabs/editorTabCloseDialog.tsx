import { ConfirmDialog } from '@ui/components/confirm-dialog';
import { useCallback, useState, useSyncExternalStore } from 'react';
import { useIntl } from 'react-intl';
import {
    clearPendingEditorTabClose,
    getEditorTabCloseGuard,
    getEditorTabDirtySnapshot,
    subscribeEditorTabDirty,
} from './editorTabDirtyStore';
import { messages } from './editorTabs.messages';
import { getEditorTabsSnapshot, subscribeEditorTabs } from './editorTabsStore';
import { useEditorTabNavigation } from './useEditorTabNavigation';

function tabTitle(
    tabId: string,
    formatMessage: ReturnType<typeof useIntl>['formatMessage'],
    tabs: ReturnType<typeof getEditorTabsSnapshot>,
): string {
    const tab = tabs.find((entry) => entry.id === tabId);
    if (!tab) return formatMessage(messages.unsavedFallbackTitle);
    switch (tab.kind) {
        case 'settings':
            return formatMessage(messages.settings);
        case 'new-quick-prompt':
            return formatMessage(messages.newQuickPrompt);
        case 'quick-prompt':
            return tab.title ?? formatMessage(messages.quickPromptFallback);
        case 'session':
            return tab.title ?? formatMessage(messages.sessionFallback);
        case 'new-session':
            return formatMessage(messages.newSession);
        case 'terminal':
            return tab.title ?? formatMessage(messages.terminalFallback);
    }
}

export function EditorTabCloseDialog() {
    const intl = useIntl();
    const { closeTab } = useEditorTabNavigation();
    const pendingId = useSyncExternalStore(
        subscribeEditorTabDirty,
        getEditorTabDirtySnapshot,
        getEditorTabDirtySnapshot,
    ).pendingCloseId;
    const tabs = useSyncExternalStore(subscribeEditorTabs, getEditorTabsSnapshot, getEditorTabsSnapshot);
    const [busy, setBusy] = useState(false);

    const onCancel = useCallback(() => {
        if (busy) return;
        clearPendingEditorTabClose();
    }, [busy]);

    const onDontSave = useCallback(() => {
        if (!pendingId || busy) return;
        const guard = getEditorTabCloseGuard(pendingId);
        guard?.discard?.();
        clearPendingEditorTabClose();
        closeTab(pendingId, { force: true });
    }, [busy, closeTab, pendingId]);

    const onSave = useCallback(() => {
        if (!pendingId || busy) return;
        const guard = getEditorTabCloseGuard(pendingId);
        if (!guard) {
            clearPendingEditorTabClose();
            closeTab(pendingId, { force: true });
            return;
        }

        setBusy(true);
        void (async () => {
            try {
                const saved = await guard.save();
                if (!saved) {
                    clearPendingEditorTabClose();
                    return;
                }
                clearPendingEditorTabClose();
                closeTab(pendingId, { force: true });
            } finally {
                setBusy(false);
            }
        })();
    }, [busy, closeTab, pendingId]);

    if (!pendingId) return null;

    const title = tabTitle(pendingId, intl.formatMessage, tabs);

    return (
        <ConfirmDialog
            message={intl.formatMessage(messages.unsavedChangesConfirm, { title })}
            confirmLabel={intl.formatMessage(messages.unsavedChangesSave)}
            alternateLabel={intl.formatMessage(messages.unsavedChangesDontSave)}
            cancelLabel={intl.formatMessage(messages.unsavedChangesCancel)}
            onConfirm={onSave}
            onAlternate={onDontSave}
            onCancel={onCancel}
            busy={busy}
            ariaLabel={intl.formatMessage(messages.unsavedChangesAriaLabel, { title })}
        />
    );
}
