import { defineMessages, type NoMessageValues } from 'react-intl';

type Messages = {
    ariaLabel: NoMessageValues;
    crumb: NoMessageValues;
    close: NoMessageValues;
    loading: NoMessageValues;
    loadFailed: NoMessageValues;
    nameLabel: NoMessageValues;
    namePlaceholder: NoMessageValues;
    agentLabel: NoMessageValues;
    start: NoMessageValues;
    starting: NoMessageValues;
    startFailed: NoMessageValues;
};

export const messages = defineMessages<Messages>(
    {
        ariaLabel: {
            id: 'newSession.ariaLabel',
            defaultMessage: 'New session',
        },
        crumb: {
            id: 'newSession.crumb',
            defaultMessage: 'new session',
        },
        close: {
            id: 'newSession.close',
            defaultMessage: 'Close',
        },
        loading: {
            id: 'newSession.loading',
            defaultMessage: 'Loading…',
        },
        loadFailed: {
            id: 'newSession.loadFailed',
            defaultMessage: 'Failed to load settings',
        },
        nameLabel: {
            id: 'newSession.nameLabel',
            defaultMessage: 'Name',
        },
        namePlaceholder: {
            id: 'newSession.namePlaceholder',
            defaultMessage: 'Session name',
        },
        agentLabel: {
            id: 'newSession.agentLabel',
            defaultMessage: 'Agent',
        },
        start: {
            id: 'newSession.start',
            defaultMessage: 'Start',
        },
        starting: {
            id: 'newSession.starting',
            defaultMessage: 'Starting…',
        },
        startFailed: {
            id: 'newSession.startFailed',
            defaultMessage: 'Failed to start session',
        },
    },
    { typed: true },
);
