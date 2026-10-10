import { defineMessages, type NoMessageValues } from 'react-intl';

type Messages = {
    logo: NoMessageValues;
    searchPlaceholder: NoMessageValues;
    searchAriaLabel: NoMessageValues;
    clearSearch: NoMessageValues;
    noMatchingSessions: NoMessageValues;
    loadingSessions: NoMessageValues;
    newSession: NoMessageValues;
    settings: NoMessageValues;
    sessionsHeading: NoMessageValues;
    collapseSidebar: NoMessageValues;
    expandSidebar: NoMessageValues;
    showSessions: NoMessageValues;
    conversationSession: NoMessageValues;
    branchLabel: { branch: string };
    cpuLabel: { percent: number };
    ramLabel: { percent: number };
    sessionActions: NoMessageValues;
    deleteSession: NoMessageValues;
    deleteConfirm: { name: string };
    deleteConfirmContinue: NoMessageValues;
    deleteConfirmCancel: NoMessageValues;
    deleteFailed: NoMessageValues;
    restartSession: NoMessageValues;
    restartFailed: NoMessageValues;
};

export const messages = defineMessages<Messages>(
    {
        logo: {
            id: 'sessionsPanel.logo',
            defaultMessage: 'Tether',
        },
        searchPlaceholder: {
            id: 'sessionsPanel.searchPlaceholder',
            defaultMessage: 'Search sessions…',
        },
        searchAriaLabel: {
            id: 'sessionsPanel.searchAriaLabel',
            defaultMessage: 'Search sessions',
        },
        clearSearch: {
            id: 'sessionsPanel.clearSearch',
            defaultMessage: 'Clear search',
        },
        noMatchingSessions: {
            id: 'sessionsPanel.noMatchingSessions',
            defaultMessage: 'No matching sessions',
        },
        loadingSessions: {
            id: 'sessionsPanel.loadingSessions',
            defaultMessage: 'Loading sessions…',
        },
        newSession: {
            id: 'sessionsPanel.newSession',
            defaultMessage: 'New session',
        },
        settings: {
            id: 'sessionsPanel.settings',
            defaultMessage: 'Settings',
        },
        sessionsHeading: {
            id: 'sessionsPanel.sessionsHeading',
            defaultMessage: 'Sessions',
        },
        collapseSidebar: {
            id: 'sessionsPanel.collapseSidebar',
            defaultMessage: 'Collapse sidebar',
        },
        expandSidebar: {
            id: 'sessionsPanel.expandSidebar',
            defaultMessage: 'Expand sidebar',
        },
        showSessions: {
            id: 'sessionsPanel.showSessions',
            defaultMessage: 'Show sessions',
        },
        conversationSession: {
            id: 'sessionsPanel.conversationSession',
            defaultMessage: 'Conversation',
        },
        branchLabel: {
            id: 'sessionsPanel.branchLabel',
            defaultMessage: '{branch}',
        },
        cpuLabel: {
            id: 'sessionsPanel.cpuLabel',
            defaultMessage: 'CPU {percent}%',
        },
        ramLabel: {
            id: 'sessionsPanel.ramLabel',
            defaultMessage: 'RAM {percent}%',
        },
        sessionActions: {
            id: 'sessionsPanel.sessionActions',
            defaultMessage: 'Session actions',
        },
        deleteSession: {
            id: 'sessionsPanel.deleteSession',
            defaultMessage: 'Delete',
        },
        deleteConfirm: {
            id: 'sessionsPanel.deleteConfirm',
            defaultMessage: 'Are you sure you want to delete {name}? All data related to this session will be lost.',
        },
        deleteConfirmContinue: {
            id: 'sessionsPanel.deleteConfirmContinue',
            defaultMessage: 'Continue',
        },
        deleteConfirmCancel: {
            id: 'sessionsPanel.deleteConfirmCancel',
            defaultMessage: 'Cancel',
        },
        deleteFailed: {
            id: 'sessionsPanel.deleteFailed',
            defaultMessage: 'Failed to delete session',
        },
        restartSession: {
            id: 'sessionsPanel.restartSession',
            defaultMessage: 'Restart session',
        },
        restartFailed: {
            id: 'sessionsPanel.restartFailed',
            defaultMessage: 'Failed to restart session',
        },
    },
    { typed: true },
);
