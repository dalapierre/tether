import { defineMessages, type NoMessageValues } from 'react-intl';

type Messages = {
    genericErrorTitle: NoMessageValues;
    genericErrorMessage: { detail: string };
    invalidBranchTitle: NoMessageValues;
    invalidBranchMessage: NoMessageValues;
    settingsSavedTitle: NoMessageValues;
    settingsSavedMessage: NoMessageValues;
    dismiss: NoMessageValues;
};

export const messages = defineMessages<Messages>(
    {
        genericErrorTitle: {
            id: 'toast.genericError.title',
            defaultMessage: 'Something went wrong',
        },
        genericErrorMessage: {
            id: 'toast.genericError.message',
            defaultMessage: '{detail}',
        },
        invalidBranchTitle: {
            id: 'toast.invalidBranch.title',
            defaultMessage: 'Invalid branch name',
        },
        invalidBranchMessage: {
            id: 'toast.invalidBranch.message',
            defaultMessage: 'Branch names must follow git naming rules.',
        },
        settingsSavedTitle: {
            id: 'toast.settingsSaved.title',
            defaultMessage: 'Settings saved',
        },
        settingsSavedMessage: {
            id: 'toast.settingsSaved.message',
            defaultMessage: 'Your settings have been updated.',
        },
        dismiss: {
            id: 'toast.dismiss',
            defaultMessage: 'Dismiss',
        },
    },
    { typed: true },
);
