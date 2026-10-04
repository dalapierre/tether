import { defineMessages, type NoMessageValues } from 'react-intl';

type Messages = {
    loading: NoMessageValues;
    loadFailed: NoMessageValues;
    empty: NoMessageValues;
    refresh: NoMessageValues;
    backToFiles: NoMessageValues;
    binaryFile: NoMessageValues;
    statusAdded: NoMessageValues;
    statusModified: NoMessageValues;
    statusDeleted: NoMessageValues;
    statusRenamed: NoMessageValues;
    additions: { count: number };
    deletions: { count: number };
    filesChanged: { count: number };
};

export const messages = defineMessages<Messages>(
    {
        loading: {
            id: 'sessionCodeView.loading',
            defaultMessage: 'Loading changes…',
        },
        loadFailed: {
            id: 'sessionCodeView.loadFailed',
            defaultMessage: 'Failed to load changes',
        },
        empty: {
            id: 'sessionCodeView.empty',
            defaultMessage: 'No code changes yet',
        },
        refresh: {
            id: 'sessionCodeView.refresh',
            defaultMessage: 'Refresh',
        },
        backToFiles: {
            id: 'sessionCodeView.backToFiles',
            defaultMessage: 'Back to files',
        },
        binaryFile: {
            id: 'sessionCodeView.binaryFile',
            defaultMessage: 'Binary file — diff not shown',
        },
        statusAdded: {
            id: 'sessionCodeView.statusAdded',
            defaultMessage: 'A',
        },
        statusModified: {
            id: 'sessionCodeView.statusModified',
            defaultMessage: 'M',
        },
        statusDeleted: {
            id: 'sessionCodeView.statusDeleted',
            defaultMessage: 'D',
        },
        statusRenamed: {
            id: 'sessionCodeView.statusRenamed',
            defaultMessage: 'R',
        },
        additions: {
            id: 'sessionCodeView.additions',
            defaultMessage: '+{count}',
        },
        deletions: {
            id: 'sessionCodeView.deletions',
            defaultMessage: '-{count}',
        },
        filesChanged: {
            id: 'sessionCodeView.filesChanged',
            defaultMessage: '{count, plural, one {# file changed} other {# files changed}}',
        },
    },
    { typed: true },
);
