import { defineMessages, type NoMessageValues } from 'react-intl';

type Messages = {
    resizeReviewPanel: NoMessageValues;
    resizeFileTree: NoMessageValues;
    resizeShellPanel: NoMessageValues;
};

export const messages = defineMessages<Messages>({
    resizeReviewPanel: {
        id: 'panelResizeHandle.resizeReviewPanel',
        defaultMessage: 'Resize review panel',
    },
    resizeFileTree: {
        id: 'panelResizeHandle.resizeFileTree',
        defaultMessage: 'Resize file list',
    },
    resizeShellPanel: {
        id: 'panelResizeHandle.resizeShellPanel',
        defaultMessage: 'Resize terminal panel',
    },
});
