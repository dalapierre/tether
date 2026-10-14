import { defineMessages, type NoMessageValues } from 'react-intl';

type Messages = {
    loading: NoMessageValues;
    loadFailed: NoMessageValues;
    notFound: NoMessageValues;
};

export const messages = defineMessages<Messages>(
    {
        loading: {
            id: 'editQuickPromptPage.loading',
            defaultMessage: 'Loading quick prompt…',
        },
        loadFailed: {
            id: 'editQuickPromptPage.loadFailed',
            defaultMessage: 'Failed to load quick prompt',
        },
        notFound: {
            id: 'editQuickPromptPage.notFound',
            defaultMessage: 'Quick prompt not found',
        },
    },
    { typed: true },
);
