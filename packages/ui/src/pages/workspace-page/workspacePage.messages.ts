import { defineMessages, type NoMessageValues } from 'react-intl';

type Messages = {
    selectSession: NoMessageValues;
    newSession: NoMessageValues;
};

export const messages = defineMessages<Messages>(
    {
        selectSession: {
            id: 'workspacePage.selectSession',
            defaultMessage: 'Select a session or create a new one',
        },
        newSession: {
            id: 'workspacePage.newSession',
            defaultMessage: '+ New session',
        },
    },
    { typed: true },
);
