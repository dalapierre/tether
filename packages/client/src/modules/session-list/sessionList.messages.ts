import { defineMessages, type NoMessageValues } from 'react-intl';

type Messages = {
    sessionsCrumb: NoMessageValues;
    noSessions: NoMessageValues;
    loadingSessions: NoMessageValues;
    sessionsLoadFailed: NoMessageValues;
    newSession: NoMessageValues;
    conversationSession: NoMessageValues;
    branchLabel: { branch: string };
    deleteConfirm: { name: string };
    deleteConfirmContinue: NoMessageValues;
    deleteConfirmCancel: NoMessageValues;
    deleteFailed: NoMessageValues;
};

export const messages = defineMessages<Messages>(
    {
        sessionsCrumb: {
            id: 'sessionList.sessionsCrumb',
            defaultMessage: 'sessions',
        },
        noSessions: {
            id: 'sessionList.noSessions',
            defaultMessage: 'No sessions',
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
            defaultMessage: 'Are you sure you want to delete {name}?',
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
    },
    { typed: true },
);
