import { defineMessages, type NoMessageValues } from 'react-intl';

type Messages = {
    projectsCrumb: NoMessageValues;
    loadingCrumb: NoMessageValues;
    notFound: NoMessageValues;
    loadFailed: NoMessageValues;
    noSessions: NoMessageValues;
    loadingSessions: NoMessageValues;
    sessionsLoadFailed: NoMessageValues;
    newSession: NoMessageValues;
    sessionMeta: { harness: string; branch: string };
    deleteSession: NoMessageValues;
    deleteConfirm: { name: string };
    deleteConfirmContinue: NoMessageValues;
    deleteConfirmCancel: NoMessageValues;
    deleteFailed: NoMessageValues;
};

export const messages = defineMessages<Messages>(
    {
        projectsCrumb: {
            id: 'projectPage.projectsCrumb',
            defaultMessage: 'projects',
        },
        loadingCrumb: {
            id: 'projectPage.loadingCrumb',
            defaultMessage: '…',
        },
        notFound: {
            id: 'projectPage.notFound',
            defaultMessage: 'Project not found',
        },
        loadFailed: {
            id: 'projectPage.loadFailed',
            defaultMessage: 'Failed to load project',
        },
        noSessions: {
            id: 'projectPage.noSessions',
            defaultMessage: 'No sessions',
        },
        loadingSessions: {
            id: 'projectPage.loadingSessions',
            defaultMessage: 'Loading sessions…',
        },
        sessionsLoadFailed: {
            id: 'projectPage.sessionsLoadFailed',
            defaultMessage: 'Failed to load sessions',
        },
        newSession: {
            id: 'projectPage.newSession',
            defaultMessage: 'New session',
        },
        sessionMeta: {
            id: 'projectPage.sessionMeta',
            defaultMessage: '{harness} · {branch}',
        },
        deleteSession: {
            id: 'projectPage.deleteSession',
            defaultMessage: 'Delete',
        },
        deleteConfirm: {
            id: 'projectPage.deleteConfirm',
            defaultMessage: 'Are you sure you want to delete {name}?',
        },
        deleteConfirmContinue: {
            id: 'projectPage.deleteConfirmContinue',
            defaultMessage: 'Continue',
        },
        deleteConfirmCancel: {
            id: 'projectPage.deleteConfirmCancel',
            defaultMessage: 'Cancel',
        },
        deleteFailed: {
            id: 'projectPage.deleteFailed',
            defaultMessage: 'Failed to delete session',
        },
    },
    { typed: true },
);
