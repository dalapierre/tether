import { defineMessages } from 'react-intl';

export const messages = defineMessages({
    ariaLabel: {
        id: 'settings.ariaLabel',
        defaultMessage: 'Settings',
    },
    crumb: {
        id: 'settings.crumb',
        defaultMessage: 'settings',
    },
    close: {
        id: 'settings.close',
        defaultMessage: 'Close',
    },
    intro: {
        id: 'settings.intro',
        defaultMessage: 'Configure repositories and the agent for new sessions.',
    },
    loading: {
        id: 'settings.loading',
        defaultMessage: 'Loading settings…',
    },
    loadFailed: {
        id: 'settings.loadFailed',
        defaultMessage: 'Failed to load settings',
    },
    saveFailed: {
        id: 'settings.saveFailed',
        defaultMessage: 'Failed to save settings',
    },
    saved: {
        id: 'settings.saved',
        defaultMessage: 'Settings saved.',
    },
    devDirLabel: {
        id: 'settings.devDirLabel',
        defaultMessage: 'Development directory',
    },
    devDirPlaceholder: {
        id: 'settings.devDirPlaceholder',
        defaultMessage: '/home/you/dev',
    },
    devDirHint: {
        id: 'settings.devDirHint',
        defaultMessage: 'Absolute path to the folder that contains your git repositories.',
    },
    agentLabel: {
        id: 'settings.agentLabel',
        defaultMessage: 'Agent',
    },
    signOut: {
        id: 'settings.signOut',
        defaultMessage: 'Sign out',
    },
    saving: {
        id: 'settings.saving',
        defaultMessage: 'Saving…',
    },
    save: {
        id: 'settings.save',
        defaultMessage: 'Save',
    },
});
