import { defineMessages, type MessageTag, type NoMessageValues } from 'react-intl';

type Messages = {
    ariaLabel: NoMessageValues;
    settingsCrumb: NoMessageValues;
    addCrumb: NoMessageValues;
    close: NoMessageValues;
    loading: NoMessageValues;
    loadFailed: NoMessageValues;
    addFailed: NoMessageValues;
    empty: { settingsLink: MessageTag };
    add: NoMessageValues;
    adding: NoMessageValues;
};

export const messages = defineMessages<Messages>(
    {
        ariaLabel: {
            id: 'addRepository.ariaLabel',
            defaultMessage: 'Add repository',
        },
        settingsCrumb: {
            id: 'addRepository.settingsCrumb',
            defaultMessage: 'settings',
        },
        addCrumb: {
            id: 'addRepository.addCrumb',
            defaultMessage: 'add',
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
                'No new repositories found. Set a development directory in <settingsLink>settings</settingsLink> first.',
        },
        add: {
            id: 'addRepository.add',
            defaultMessage: 'Add',
        },
        adding: {
            id: 'addRepository.adding',
            defaultMessage: 'Adding…',
        },
    },
    { typed: true },
);
