import { defineMessages, type NoMessageValues } from 'react-intl';

type Messages = {
    title: NoMessageValues;
    ariaLabel: NoMessageValues;
    close: NoMessageValues;
};

export const messages = defineMessages<Messages>(
    {
        title: {
            id: 'newQuickPrompt.title',
            defaultMessage: 'New quick prompt',
        },
        ariaLabel: {
            id: 'newQuickPrompt.ariaLabel',
            defaultMessage: 'New quick prompt',
        },
        close: {
            id: 'newQuickPrompt.close',
            defaultMessage: 'Close',
        },
    },
    { typed: true },
);
