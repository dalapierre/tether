import { defineMessages, type NoMessageValues } from 'react-intl';

type Messages = {
    title: NoMessageValues;
    editTitle: NoMessageValues;
    ariaLabel: NoMessageValues;
    editAriaLabel: NoMessageValues;
    close: NoMessageValues;
    nameLabel: NoMessageValues;
    namePlaceholder: NoMessageValues;
    descriptionLabel: NoMessageValues;
    descriptionPlaceholder: NoMessageValues;
    promptLabel: NoMessageValues;
    promptHint: { example: string };
    promptPlaceholder: NoMessageValues;
    inputNamePlaceholder: NoMessageValues;
    inputTypeLabel: NoMessageValues;
    typeString: NoMessageValues;
    typeNumber: NoMessageValues;
    typeBoolean: NoMessageValues;
    removeInput: NoMessageValues;
    addInput: NoMessageValues;
    create: NoMessageValues;
    creating: NoMessageValues;
    createFailed: NoMessageValues;
    save: NoMessageValues;
    saving: NoMessageValues;
    saveFailed: NoMessageValues;
    invalidInputName: NoMessageValues;
    inputNameRequired: NoMessageValues;
    duplicateInputName: NoMessageValues;
    inputNameHint: NoMessageValues;
};

export const messages = defineMessages<Messages>(
    {
        title: {
            id: 'newQuickPrompt.title',
            defaultMessage: 'New quick prompt',
        },
        editTitle: {
            id: 'newQuickPrompt.editTitle',
            defaultMessage: 'Edit quick prompt',
        },
        ariaLabel: {
            id: 'newQuickPrompt.ariaLabel',
            defaultMessage: 'New quick prompt',
        },
        editAriaLabel: {
            id: 'newQuickPrompt.editAriaLabel',
            defaultMessage: 'Edit quick prompt',
        },
        close: {
            id: 'newQuickPrompt.close',
            defaultMessage: 'Close',
        },
        nameLabel: {
            id: 'newQuickPrompt.nameLabel',
            defaultMessage: 'Name',
        },
        namePlaceholder: {
            id: 'newQuickPrompt.namePlaceholder',
            defaultMessage: 'Prompt name',
        },
        descriptionLabel: {
            id: 'newQuickPrompt.descriptionLabel',
            defaultMessage: 'Description',
        },
        descriptionPlaceholder: {
            id: 'newQuickPrompt.descriptionPlaceholder',
            defaultMessage: 'Short description (optional)',
        },
        promptLabel: {
            id: 'newQuickPrompt.promptLabel',
            defaultMessage: 'Prompt',
        },
        promptHint: {
            id: 'newQuickPrompt.promptHint',
            defaultMessage: 'Reference inputs with angle brackets, e.g. {example}.',
        },
        promptPlaceholder: {
            id: 'newQuickPrompt.promptPlaceholder',
            defaultMessage: 'Write the prompt…',
        },
        inputNamePlaceholder: {
            id: 'newQuickPrompt.inputNamePlaceholder',
            defaultMessage: 'Input name',
        },
        inputTypeLabel: {
            id: 'newQuickPrompt.inputTypeLabel',
            defaultMessage: 'Type',
        },
        typeString: {
            id: 'newQuickPrompt.typeString',
            defaultMessage: 'String',
        },
        typeNumber: {
            id: 'newQuickPrompt.typeNumber',
            defaultMessage: 'Number',
        },
        typeBoolean: {
            id: 'newQuickPrompt.typeBoolean',
            defaultMessage: 'Boolean',
        },
        removeInput: {
            id: 'newQuickPrompt.removeInput',
            defaultMessage: 'Remove input',
        },
        addInput: {
            id: 'newQuickPrompt.addInput',
            defaultMessage: 'Add input',
        },
        create: {
            id: 'newQuickPrompt.create',
            defaultMessage: 'Create',
        },
        creating: {
            id: 'newQuickPrompt.creating',
            defaultMessage: 'Creating…',
        },
        createFailed: {
            id: 'newQuickPrompt.createFailed',
            defaultMessage: 'Failed to create quick prompt',
        },
        save: {
            id: 'newQuickPrompt.save',
            defaultMessage: 'Save',
        },
        saving: {
            id: 'newQuickPrompt.saving',
            defaultMessage: 'Saving…',
        },
        saveFailed: {
            id: 'newQuickPrompt.saveFailed',
            defaultMessage: 'Failed to save quick prompt',
        },
        invalidInputName: {
            id: 'newQuickPrompt.invalidInputName',
            defaultMessage: 'Use lowercase letters, numbers, and dashes (e.g. my-cool-input)',
        },
        inputNameRequired: {
            id: 'newQuickPrompt.inputNameRequired',
            defaultMessage: 'Input name is required',
        },
        duplicateInputName: {
            id: 'newQuickPrompt.duplicateInputName',
            defaultMessage: 'Input names must be unique',
        },
        inputNameHint: {
            id: 'newQuickPrompt.inputNameHint',
            defaultMessage: 'Lowercase, dash-separated id (e.g. my-cool-input)',
        },
    },
    { typed: true },
);
