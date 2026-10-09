import { defineMessages, type NoMessageValues } from 'react-intl';

type Messages = {
    breadcrumb: NoMessageValues;
    back: NoMessageValues;
};

export const messages = defineMessages<Messages>({
    breadcrumb: {
        id: 'routePanel.breadcrumb',
        defaultMessage: 'Breadcrumb',
    },
    back: {
        id: 'routePanel.back',
        defaultMessage: 'Back',
    },
});
