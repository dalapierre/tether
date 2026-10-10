import { defineMessages, type NoMessageValues } from 'react-intl';

type Messages = {
    title: NoMessageValues;
    placeholder: NoMessageValues;
    lineSingle: { line: number };
    lineRange: { start: number; end: number };
    cancel: NoMessageValues;
    confirm: NoMessageValues;
};

export const messages = defineMessages<Messages>(
    {
        title: {
            id: 'commentDialog.title',
            defaultMessage: 'Add a comment',
        },
        placeholder: {
            id: 'commentDialog.placeholder',
            defaultMessage: 'Leave a comment',
        },
        lineSingle: {
            id: 'commentDialog.lineSingle',
            defaultMessage: 'Line {line}',
        },
        lineRange: {
            id: 'commentDialog.lineRange',
            defaultMessage: 'Line {start}-{end}',
        },
        cancel: {
            id: 'commentDialog.cancel',
            defaultMessage: 'Cancel',
        },
        confirm: {
            id: 'commentDialog.confirm',
            defaultMessage: 'Confirm',
        },
    },
    { typed: true },
);
