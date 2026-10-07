import { defineMessages, type NoMessageValues } from 'react-intl';

type Messages = {
    searchPlaceholder: NoMessageValues;
    searchAriaLabel: NoMessageValues;
    clearSearch: NoMessageValues;
    noSessions: NoMessageValues;
    noMatchingSessions: NoMessageValues;
    loadingSessions: NoMessageValues;
    sessionsLoadFailed: NoMessageValues;
    newSession: NoMessageValues;
    conversationSession: NoMessageValues;
    branchLabel: { branch: string };
    deleteConfirm: { name: string };
    deleteConfirmContinue: NoMessageValues;
    deleteConfirmCancel: NoMessageValues;
    deleteFailed: NoMessageValues;
    restartSession: NoMessageValues;
    restartFailed: NoMessageValues;
};

export const messages = defineMessages<Messages>(
    {
        searchPlaceholder: {
            id: 'sessionList.searchPlaceholder',
            defaultMessage: 'Search sessions…',
        },
        searchAriaLabel: {
            id: 'sessionList.searchAriaLabel',
            defaultMessage: 'Search sessions',
        },
        clearSearch: {
            id: 'sessionList.clearSearch',
            defaultMessage: 'Clear search',
        },
        noSessions: {
            id: 'sessionList.noSessions',
            defaultMessage: 'No sessions',
        },
        noMatchingSessions: {
            id: 'sessionList.noMatchingSessions',
            defaultMessage: 'No matching sessions',
        },
        loadingSessions: {
            id: 'sessionList.loadingSessions',
            defaultMessage: 'Loading sessions…',
        },
        sessionsLoadFailed: {
            id: 'sessionList.sessionsLoadFailed',
            defaultMessage: 'Failed to load sessions',
        },
        newSession: {
            id: 'sessionList.newSession',
            defaultMessage: 'New session',
        },
        conversationSession: {
            id: 'sessionList.conversationSession',
            defaultMessage: 'Conversation',
        },
        branchLabel: {
            id: 'sessionList.branchLabel',
            defaultMessage: 'Branch - {branch}',
        },
        deleteConfirm: {
            id: 'sessionList.deleteConfirm',
            defaultMessage: 'Are you sure you want to delete {name}? All data related to this session will be lost.',
        },
        deleteConfirmContinue: {
            id: 'sessionList.deleteConfirmContinue',
            defaultMessage: 'Continue',
        },
        deleteConfirmCancel: {
            id: 'sessionList.deleteConfirmCancel',
            defaultMessage: 'Cancel',
        },
        deleteFailed: {
            id: 'sessionList.deleteFailed',
            defaultMessage: 'Failed to delete session',
        },
        restartSession: {
            id: 'sessionList.restartSession',
            defaultMessage: 'Restart session',
        },
        restartFailed: {
            id: 'sessionList.restartFailed',
            defaultMessage: 'Failed to restart session',
        },
    },
    { typed: true },
);
