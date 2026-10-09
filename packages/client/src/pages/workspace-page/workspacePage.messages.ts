import { defineMessages, type NoMessageValues } from 'react-intl';

type Messages = {
    selectSession: NoMessageValues;
};

export const messages = defineMessages<Messages>(
    {
        selectSession: {
            id: 'workspacePage.selectSession',
            defaultMessage: 'Select a session or create a new one',
        },
    },
    { typed: true },
);
