import { defineMessages, type NoMessageValues } from 'react-intl';

type Messages = {
    explainSplitFailed: NoMessageValues;
};

export const messages = defineMessages<Messages>({
    explainSplitFailed: {
        id: 'workspaceTerminal.explainSplitFailed',
        defaultMessage: 'Cannot split terminal — maximum number of shells reached',
    },
});
