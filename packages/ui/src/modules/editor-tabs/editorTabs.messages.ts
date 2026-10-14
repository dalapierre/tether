import { defineMessages, type MessageDescriptor } from 'react-intl';

type NoMessageValues = undefined;

type EditorTabsMessages = {
    tabList: NoMessageValues;
    settings: NoMessageValues;
    newSession: NoMessageValues;
    newQuickPrompt: NoMessageValues;
    closeTab: NoMessageValues;
    sessionFallback: NoMessageValues;
    terminalFallback: NoMessageValues;
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
    terminalFallback: {
        id: 'editorTabs.terminalFallback',
        defaultMessage: 'Terminal',
    },
});
