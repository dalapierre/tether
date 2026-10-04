import { defineMessages, type MessageTag, type NoMessageValues } from 'react-intl';

type Messages = {
    ariaLabel: NoMessageValues;
    projectsCrumb: NoMessageValues;
    addCrumb: NoMessageValues;
    confirmCrumb: NoMessageValues;
    close: NoMessageValues;
    loading: NoMessageValues;
    loadFailed: NoMessageValues;
    addFailed: NoMessageValues;
    empty: { settingsLink: MessageTag };
    next: NoMessageValues;
    confirmQuestion: { name: string };
    back: NoMessageValues;
    adding: NoMessageValues;
    confirm: NoMessageValues;
};

export const messages = defineMessages<Messages>(
    {
        ariaLabel: {
            id: 'addRepository.ariaLabel',
            defaultMessage: 'Add repository',
        },
        projectsCrumb: {
            id: 'addRepository.projectsCrumb',
            defaultMessage: 'projects',
        },
        addCrumb: {
            id: 'addRepository.addCrumb',
            defaultMessage: 'add',
        },
        confirmCrumb: {
            id: 'addRepository.confirmCrumb',
            defaultMessage: 'confirm',
        },
        close: {
            id: 'addRepository.close',
            defaultMessage: 'Close',
        },
        loading: {
            id: 'addRepository.loading',
            defaultMessage: 'Looking for repositories…',
        },
        loadFailed: {
            id: 'addRepository.loadFailed',
            defaultMessage: 'Failed to load repositories',
        },
        addFailed: {
            id: 'addRepository.addFailed',
            defaultMessage: 'Failed to add repository',
        },
        empty: {
            id: 'addRepository.empty',
            defaultMessage:
                'No new repositories found. Set a development directory in <settingsLink>Settings</settingsLink>.',
        },
        next: {
            id: 'addRepository.next',
            defaultMessage: 'Next',
        },
        confirmQuestion: {
            id: 'addRepository.confirmQuestion',
            defaultMessage: 'Are you sure you want to add {name}?',
        },
        back: {
            id: 'addRepository.back',
            defaultMessage: 'Back',
        },
        adding: {
            id: 'addRepository.adding',
            defaultMessage: 'Adding…',
        },
        confirm: {
            id: 'addRepository.confirm',
            defaultMessage: 'Confirm',
        },
    },
    { typed: true },
);
