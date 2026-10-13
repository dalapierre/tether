import { defineMessages, type MessageDescriptor } from 'react-intl';

type NoMessageValues = undefined;

type EditorTabsMessages = {
    tabList: NoMessageValues;
    settings: NoMessageValues;
    newSession: NoMessageValues;
    closeTab: NoMessageValues;
    sessionFallback: NoMessageValues;
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
    closeTab: {
        id: 'editorTabs.closeTab',
        defaultMessage: 'Close',
    },
    sessionFallback: {
        id: 'editorTabs.sessionFallback',
        defaultMessage: 'Session',
    },
});
