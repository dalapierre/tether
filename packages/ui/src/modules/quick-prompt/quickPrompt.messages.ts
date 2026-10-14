import { defineMessages, type NoMessageValues } from 'react-intl';

type Messages = {
    ariaLabel: NoMessageValues;
    placeholder: NoMessageValues;
    empty: NoMessageValues;
    noResults: NoMessageValues;
    loading: NoMessageValues;
    loadFailed: NoMessageValues;
    fillTitle: NoMessageValues;
    fillHint: NoMessageValues;
    inputValuePlaceholder: NoMessageValues;
    booleanTrue: NoMessageValues;
    booleanFalse: NoMessageValues;
    submit: NoMessageValues;
    back: NoMessageValues;
    invalidNumber: NoMessageValues;
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
        loading: {
            id: 'quickPrompt.loading',
            defaultMessage: 'Loading prompts…',
        },
        loadFailed: {
            id: 'quickPrompt.loadFailed',
            defaultMessage: 'Failed to load prompts',
        },
        fillTitle: {
            id: 'quickPrompt.fillTitle',
            defaultMessage: 'Fill inputs',
        },
        fillHint: {
            id: 'quickPrompt.fillHint',
            defaultMessage: 'Provide a value for each input before sending.',
        },
        inputValuePlaceholder: {
            id: 'quickPrompt.inputValuePlaceholder',
            defaultMessage: 'Value',
        },
        booleanTrue: {
            id: 'quickPrompt.booleanTrue',
            defaultMessage: 'True',
        },
        booleanFalse: {
            id: 'quickPrompt.booleanFalse',
            defaultMessage: 'False',
        },
        submit: {
            id: 'quickPrompt.submit',
            defaultMessage: 'Send',
        },
        back: {
            id: 'quickPrompt.back',
            defaultMessage: 'Back',
        },
        invalidNumber: {
            id: 'quickPrompt.invalidNumber',
            defaultMessage: 'Enter a valid number',
        },
    },
    { typed: true },
);
