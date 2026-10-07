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
    collapseAllFolders: NoMessageValues;
    resetReviews: NoMessageValues;
    discardChange: NoMessageValues;
    discardConfirm: { path: string };
    discardConfirmCancel: NoMessageValues;
    discardConfirmContinue: NoMessageValues;
    discardFailed: NoMessageValues;
    commentSelection: NoMessageValues;
    reviewed: NoMessageValues;
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
        collapseAllFolders: {
            id: 'sessionCodeView.collapseAllFolders',
            defaultMessage: 'Collapse all folders',
        },
        resetReviews: {
            id: 'sessionCodeView.resetReviews',
            defaultMessage: 'Reset reviews',
        },
        discardChange: {
            id: 'sessionCodeView.discardChange',
            defaultMessage: 'Discard changes',
        },
        discardConfirm: {
            id: 'sessionCodeView.discardConfirm',
            defaultMessage: 'Are you sure you want to discard changes in {path}?',
        },
        discardConfirmCancel: {
            id: 'sessionCodeView.discardConfirmCancel',
            defaultMessage: 'Cancel',
        },
        discardConfirmContinue: {
            id: 'sessionCodeView.discardConfirmContinue',
            defaultMessage: 'Discard',
        },
        discardFailed: {
            id: 'sessionCodeView.discardFailed',
            defaultMessage: 'Failed to discard changes',
        },
        commentSelection: {
            id: 'sessionCodeView.commentSelection',
            defaultMessage: 'Add comment',
        },
        reviewed: {
            id: 'sessionCodeView.reviewed',
            defaultMessage: 'Reviewed',
        },
    },
    { typed: true },
);
