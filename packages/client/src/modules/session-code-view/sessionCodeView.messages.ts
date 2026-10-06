import { defineMessages, type NoMessageValues } from 'react-intl';

type Messages = {
    loading: NoMessageValues;
    filesChangedTitle: NoMessageValues;
    loadFailed: NoMessageValues;
    empty: NoMessageValues;
    selectFile: NoMessageValues;
    backToFiles: NoMessageValues;
    binaryFile: NoMessageValues;
    showMarkdownPreview: NoMessageValues;
    showCodeView: NoMessageValues;
    statusAdded: NoMessageValues;
    statusModified: NoMessageValues;
    statusDeleted: NoMessageValues;
    statusRenamed: NoMessageValues;
    additions: { count: number };
    deletions: { count: number };
    filesChanged: { count: number };
    expandFolder: { name: string };
    collapseFolder: { name: string };
};

export const messages = defineMessages<Messages>(
    {
        loading: {
            id: 'sessionCodeView.loading',
            defaultMessage: 'Loading changes…',
        },
        filesChangedTitle: {
            id: 'sessionCodeView.filesChangedTitle',
            defaultMessage: 'Files changed',
        },
        loadFailed: {
            id: 'sessionCodeView.loadFailed',
            defaultMessage: 'Failed to load changes',
        },
        empty: {
            id: 'sessionCodeView.empty',
            defaultMessage: 'No code changes yet',
        },
        selectFile: {
            id: 'sessionCodeView.selectFile',
            defaultMessage: 'Select a file to review',
        },
        backToFiles: {
            id: 'sessionCodeView.backToFiles',
            defaultMessage: 'Back to files',
        },
        binaryFile: {
            id: 'sessionCodeView.binaryFile',
            defaultMessage: 'Binary file — diff not shown',
        },
        showMarkdownPreview: {
            id: 'sessionCodeView.showMarkdownPreview',
            defaultMessage: 'Show markdown preview',
        },
        showCodeView: {
            id: 'sessionCodeView.showCodeView',
            defaultMessage: 'Show code view',
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
        expandFolder: {
            id: 'sessionCodeView.expandFolder',
            defaultMessage: 'Expand {name}',
        },
        collapseFolder: {
            id: 'sessionCodeView.collapseFolder',
            defaultMessage: 'Collapse {name}',
        },
    },
    { typed: true },
);
