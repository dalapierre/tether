import { defineMessages, type NoMessageValues } from 'react-intl';

type Messages = {
    genericErrorTitle: NoMessageValues;
    genericErrorMessage: { detail: string };
    settingsSavedTitle: NoMessageValues;
    settingsSavedMessage: NoMessageValues;
    repositoryAddedTitle: NoMessageValues;
    repositoryAddedMessage: { name: string };
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
        settingsSavedTitle: {
            id: 'toast.settingsSaved.title',
            defaultMessage: 'Settings saved',
        },
        settingsSavedMessage: {
            id: 'toast.settingsSaved.message',
            defaultMessage: 'Your settings have been updated.',
        },
        repositoryAddedTitle: {
            id: 'toast.repositoryAdded.title',
            defaultMessage: 'Repository added',
        },
        repositoryAddedMessage: {
            id: 'toast.repositoryAdded.message',
            defaultMessage: '{name} was added successfully.',
        },
        dismiss: {
            id: 'toast.dismiss',
            defaultMessage: 'Dismiss',
        },
    },
    { typed: true },
);
