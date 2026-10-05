import { defineMessages, type NoMessageValues } from 'react-intl';

type Messages = {
    sessionsCrumb: NoMessageValues;
    loadingCrumb: NoMessageValues;
    loading: NoMessageValues;
    loadFailed: NoMessageValues;
    notFound: NoMessageValues;
    connecting: NoMessageValues;
    disconnected: NoMessageValues;
    statusReady: NoMessageValues;
    statusBusy: NoMessageValues;
    statusError: NoMessageValues;
    metaConversation: { harness: string };
    viewTabs: NoMessageValues;
    agentView: NoMessageValues;
    reviewView: NoMessageValues;
    openReview: NoMessageValues;
    closeReview: NoMessageValues;
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
        metaConversation: {
            id: 'sessionView.metaConversation',
            defaultMessage: '{harness}',
        },
        viewTabs: {
            id: 'sessionView.viewTabs',
            defaultMessage: 'Session view',
        },
        agentView: {
            id: 'sessionView.agentView',
            defaultMessage: 'Agent',
        },
        reviewView: {
            id: 'sessionView.reviewView',
            defaultMessage: 'Review',
        },
        openReview: {
            id: 'sessionView.openReview',
            defaultMessage: 'Review',
        },
        closeReview: {
            id: 'sessionView.closeReview',
            defaultMessage: 'Close review',
        },
    },
    { typed: true },
);
