import { defineMessages, type NoMessageValues } from 'react-intl';

type Messages = {
    genericErrorTitle: NoMessageValues;
    genericErrorMessage: { detail: string };
    invalidBranchTitle: NoMessageValues;
    invalidBranchMessage: NoMessageValues;
    branchInUseTitle: NoMessageValues;
    branchInUseMessage: NoMessageValues;
    settingsSavedTitle: NoMessageValues;
    settingsSavedMessage: NoMessageValues;
    sessionReadyTitle: { name: string };
    sessionReadyMessage: NoMessageValues;
    sessionErrorTitle: { name: string };
    sessionErrorMessage: NoMessageValues;
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
        branchInUseTitle: {
            id: 'toast.branchInUse.title',
            defaultMessage: 'Branch already in use',
        },
        branchInUseMessage: {
            id: 'toast.branchInUse.message',
            defaultMessage: 'Another worktree already has this branch checked out.',
        },
        settingsSavedTitle: {
            id: 'toast.settingsSaved.title',
            defaultMessage: 'Settings saved',
        },
        settingsSavedMessage: {
            id: 'toast.settingsSaved.message',
            defaultMessage: 'Your settings have been updated.',
        },
        sessionReadyTitle: {
            id: 'toast.sessionReady.title',
            defaultMessage: 'Session {name} is ready',
        },
        sessionReadyMessage: {
            id: 'toast.sessionReady.message',
            defaultMessage: 'The agent finished working.',
        },
        sessionErrorTitle: {
            id: 'toast.sessionError.title',
            defaultMessage: 'Session {name} encountered an error',
        },
        sessionErrorMessage: {
            id: 'toast.sessionError.message',
            defaultMessage: 'Check the session for details.',
        },
        dismiss: {
            id: 'toast.dismiss',
            defaultMessage: 'Dismiss',
        },
    },
    { typed: true },
);
