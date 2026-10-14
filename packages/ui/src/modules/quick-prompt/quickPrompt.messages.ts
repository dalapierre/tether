import { defineMessages, type NoMessageValues } from 'react-intl';

type Messages = {
    ariaLabel: NoMessageValues;
    placeholder: NoMessageValues;
    empty: NoMessageValues;
    noResults: NoMessageValues;
};

export const messages = defineMessages<Messages>(
    {
        ariaLabel: {
            id: 'quickPrompt.ariaLabel',
            defaultMessage: 'Quick prompt',
        },
        placeholder: {
            id: 'quickPrompt.placeholder',
            defaultMessage: 'Search prompts…',
        },
        empty: {
            id: 'quickPrompt.empty',
            defaultMessage: 'No prompts available',
        },
        noResults: {
            id: 'quickPrompt.noResults',
            defaultMessage: 'No matching prompts',
        },
    },
    { typed: true },
);
