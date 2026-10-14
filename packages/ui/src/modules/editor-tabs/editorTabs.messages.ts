import { defineMessages, type MessageDescriptor } from 'react-intl';

type NoMessageValues = undefined;

type EditorTabsMessages = {
    tabList: NoMessageValues;
    settings: NoMessageValues;
    newSession: NoMessageValues;
    newQuickPrompt: NoMessageValues;
    closeTab: NoMessageValues;
    sessionFallback: NoMessageValues;
    quickPromptFallback: NoMessageValues;
    terminalFallback: NoMessageValues;
    unsavedFallbackTitle: NoMessageValues;
    unsavedChangesConfirm: { title: string };
    unsavedChangesSave: NoMessageValues;
    unsavedChangesDontSave: NoMessageValues;
    unsavedChangesCancel: NoMessageValues;
    unsavedChangesAriaLabel: { title: string };
};

export const messages: {
    [K in keyof EditorTabsMessages]: MessageDescriptor;
} = defineMessages({
    tabList: {
        id: 'editorTabs.tabList',
        defaultMessage: 'Open editors',
    },
    settings: {
        id: 'editorTabs.settings',
        defaultMessage: 'Settings',
    },
    newSession: {
        id: 'editorTabs.newSession',
        defaultMessage: 'New session',
    },
    newQuickPrompt: {
        id: 'editorTabs.newQuickPrompt',
        defaultMessage: 'New quick prompt',
    },
    closeTab: {
        id: 'editorTabs.closeTab',
        defaultMessage: 'Close',
    },
    sessionFallback: {
        id: 'editorTabs.sessionFallback',
        defaultMessage: 'Session',
    },
    quickPromptFallback: {
        id: 'editorTabs.quickPromptFallback',
        defaultMessage: 'Quick prompt',
    },
    terminalFallback: {
        id: 'editorTabs.terminalFallback',
        defaultMessage: 'Terminal',
    },
    unsavedFallbackTitle: {
        id: 'editorTabs.unsavedFallbackTitle',
        defaultMessage: 'Untitled',
    },
    unsavedChangesConfirm: {
        id: 'editorTabs.unsavedChangesConfirm',
        defaultMessage: 'Do you want to save the changes you made to {title}?',
    },
    unsavedChangesSave: {
        id: 'editorTabs.unsavedChangesSave',
        defaultMessage: 'Save',
    },
    unsavedChangesDontSave: {
        id: 'editorTabs.unsavedChangesDontSave',
        defaultMessage: "Don't save",
    },
    unsavedChangesCancel: {
        id: 'editorTabs.unsavedChangesCancel',
        defaultMessage: 'Cancel',
    },
    unsavedChangesAriaLabel: {
        id: 'editorTabs.unsavedChangesAriaLabel',
        defaultMessage: 'Unsaved changes to {title}',
    },
});
