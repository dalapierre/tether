import { defineMessages, type NoMessageValues } from 'react-intl';

type Messages = {
    projectsCrumb: NoMessageValues;
    loadingCrumb: NoMessageValues;
    loading: NoMessageValues;
    loadFailed: NoMessageValues;
    notFound: NoMessageValues;
    connecting: NoMessageValues;
    disconnected: NoMessageValues;
    messagePlaceholder: NoMessageValues;
    send: NoMessageValues;
    statusReady: NoMessageValues;
    statusBusy: NoMessageValues;
    statusError: NoMessageValues;
    meta: { harness: string; branch: string };
};

export const messages = defineMessages<Messages>(
    {
        projectsCrumb: {
            id: 'sessionView.projectsCrumb',
            defaultMessage: 'projects',
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
        messagePlaceholder: {
            id: 'sessionView.messagePlaceholder',
            defaultMessage: 'Message the agent…',
        },
        send: {
            id: 'sessionView.send',
            defaultMessage: 'Send',
        },
        statusReady: {
            id: 'sessionView.statusReady',
            defaultMessage: 'Ready',
        },
        statusBusy: {
            id: 'sessionView.statusBusy',
            defaultMessage: 'Working',
        },
        statusError: {
            id: 'sessionView.statusError',
            defaultMessage: 'Error',
        },
        meta: {
            id: 'sessionView.meta',
            defaultMessage: '{harness} · {branch}',
        },
    },
    { typed: true },
);
