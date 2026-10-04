import { defineMessages, type NoMessageValues } from 'react-intl';

type Messages = {
    projectNotFound: NoMessageValues;
    loadFailed: NoMessageValues;
    loadingCrumb: NoMessageValues;
};

export const messages = defineMessages<Messages>(
    {
        projectNotFound: {
            id: 'sessionPage.projectNotFound',
            defaultMessage: 'Project not found',
        },
        loadFailed: {
            id: 'sessionPage.loadFailed',
            defaultMessage: 'Failed to load project',
        },
        loadingCrumb: {
            id: 'sessionPage.loadingCrumb',
            defaultMessage: '…',
        },
    },
    { typed: true },
);
