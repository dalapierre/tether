import { defineMessages, type NoMessageValues } from 'react-intl';

type Messages = {
    sessionsCrumb: NoMessageValues;
    loadingCrumb: NoMessageValues;
    loading: NoMessageValues;
    loadFailed: NoMessageValues;
    notFound: NoMessageValues;
    connecting: NoMessageValues;
    disconnected: NoMessageValues;
    metaConversation: { harness: string };
    branchBehindDefault: { count: number };
    viewTabs: NoMessageValues;
    agentView: NoMessageValues;
    terminalView: NoMessageValues;
    reviewView: NoMessageValues;
    openTerminal: NoMessageValues;
    closeTerminal: NoMessageValues;
    openReview: NoMessageValues;
    closeReview: NoMessageValues;
    arrowUp: NoMessageValues;
    arrowDown: NoMessageValues;
    clearInput: NoMessageValues;
    paste: NoMessageValues;
    pasteSheetTitle: NoMessageValues;
    pasteSheetHint: NoMessageValues;
    pasteSheetCancel: NoMessageValues;
    pasteSheetInsert: NoMessageValues;
};

export const messages = defineMessages<Messages>(
    {
        sessionsCrumb: {
            id: 'sessionView.sessionsCrumb',
            defaultMessage: 'sessions',
        },
        loadingCrumb: {
            id: 'sessionView.loadingCrumb',
            defaultMessage: '…',
        },
        loading: {
            id: 'sessionView.loading',
            defaultMessage: 'Loading session…',
        },
        loadFailed: {
            id: 'sessionView.loadFailed',
            defaultMessage: 'Failed to load session',
        },
        notFound: {
            id: 'sessionView.notFound',
            defaultMessage: 'Session not found',
        },
        connecting: {
            id: 'sessionView.connecting',
            defaultMessage: 'Connecting…',
        },
        disconnected: {
            id: 'sessionView.disconnected',
            defaultMessage: 'Disconnected',
        },
        metaConversation: {
            id: 'sessionView.metaConversation',
            defaultMessage: '{harness}',
        },
        branchBehindDefault: {
            id: 'sessionView.branchBehindDefault',
            defaultMessage: '{count} behind',
        },
        viewTabs: {
            id: 'sessionView.viewTabs',
            defaultMessage: 'Session view',
        },
        agentView: {
            id: 'sessionView.agentView',
            defaultMessage: 'Agent',
        },
        terminalView: {
            id: 'sessionView.terminalView',
            defaultMessage: 'Terminal',
        },
        reviewView: {
            id: 'sessionView.reviewView',
            defaultMessage: 'Review',
        },
        openTerminal: {
            id: 'sessionView.openTerminal',
            defaultMessage: 'Open terminal',
        },
        closeTerminal: {
            id: 'sessionView.closeTerminal',
            defaultMessage: 'Close terminal',
        },
        openReview: {
            id: 'sessionView.openReview',
            defaultMessage: 'Review',
        },
        closeReview: {
            id: 'sessionView.closeReview',
            defaultMessage: 'Close review',
        },
        arrowUp: {
            id: 'sessionView.arrowUp',
            defaultMessage: 'Up arrow',
        },
        arrowDown: {
            id: 'sessionView.arrowDown',
            defaultMessage: 'Down arrow',
        },
        clearInput: {
            id: 'sessionView.clearInput',
            defaultMessage: 'Clear prompt',
        },
        paste: {
            id: 'sessionView.paste',
            defaultMessage: 'Paste from clipboard',
        },
        pasteSheetTitle: {
            id: 'sessionView.pasteSheetTitle',
            defaultMessage: 'Paste into session',
        },
        pasteSheetHint: {
            id: 'sessionView.pasteSheetHint',
            defaultMessage: 'Long-press the field and choose Paste',
        },
        pasteSheetCancel: {
            id: 'sessionView.pasteSheetCancel',
            defaultMessage: 'Cancel',
        },
        pasteSheetInsert: {
            id: 'sessionView.pasteSheetInsert',
            defaultMessage: 'Insert',
        },
    },
    { typed: true },
);
