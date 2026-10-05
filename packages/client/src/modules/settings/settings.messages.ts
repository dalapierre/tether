import { defineMessages, type NoMessageValues } from 'react-intl';

type Messages = {
    ariaLabel: NoMessageValues;
    crumb: NoMessageValues;
    close: NoMessageValues;
    intro: NoMessageValues;
    loading: NoMessageValues;
    loadFailed: NoMessageValues;
    saveFailed: NoMessageValues;
    devDirLabel: NoMessageValues;
    devDirPlaceholder: NoMessageValues;
    devDirHint: NoMessageValues;
    projectsLabel: NoMessageValues;
    projectsEmpty: NoMessageValues;
    projectsLoadFailed: NoMessageValues;
    addProjectLabel: NoMessageValues;
    addProjectPlaceholder: NoMessageValues;
    addProjectEmpty: NoMessageValues;
    addProjectNoResults: NoMessageValues;
    addProjectFailed: NoMessageValues;
    removeProject: NoMessageValues;
    removeProjectConfirm: { name: string };
    removeProjectConfirmContinue: NoMessageValues;
    removeProjectConfirmCancel: NoMessageValues;
    removeProjectFailed: NoMessageValues;
    agentLabel: NoMessageValues;
    yoloModeLabel: NoMessageValues;
    yoloModeHint: NoMessageValues;
    signOut: NoMessageValues;
    saving: NoMessageValues;
    save: NoMessageValues;
};

export const messages = defineMessages<Messages>(
    {
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
            defaultMessage: 'Configure projects and the agent for new sessions.',
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
        projectsLabel: {
            id: 'settings.projectsLabel',
            defaultMessage: 'Projects',
        },
        projectsEmpty: {
            id: 'settings.projectsEmpty',
            defaultMessage: 'No projects yet. Add a repository from your development directory.',
        },
        projectsLoadFailed: {
            id: 'settings.projectsLoadFailed',
            defaultMessage: 'Failed to load projects',
        },
        addProjectLabel: {
            id: 'settings.addProjectLabel',
            defaultMessage: 'Add project',
        },
        addProjectPlaceholder: {
            id: 'settings.addProjectPlaceholder',
            defaultMessage: 'Search repositories…',
        },
        addProjectEmpty: {
            id: 'settings.addProjectEmpty',
            defaultMessage: 'No new repositories found in the development directory.',
        },
        addProjectNoResults: {
            id: 'settings.addProjectNoResults',
            defaultMessage: 'No matching repositories.',
        },
        addProjectFailed: {
            id: 'settings.addProjectFailed',
            defaultMessage: 'Failed to add repository',
        },
        removeProject: {
            id: 'settings.removeProject',
            defaultMessage: 'Remove',
        },
        removeProjectConfirm: {
            id: 'settings.removeProjectConfirm',
            defaultMessage: 'Remove {name} from Tether? Existing sessions are not deleted.',
        },
        removeProjectConfirmContinue: {
            id: 'settings.removeProjectConfirmContinue',
            defaultMessage: 'Remove',
        },
        removeProjectConfirmCancel: {
            id: 'settings.removeProjectConfirmCancel',
            defaultMessage: 'Cancel',
        },
        removeProjectFailed: {
            id: 'settings.removeProjectFailed',
            defaultMessage: 'Failed to remove project',
        },
        agentLabel: {
            id: 'settings.agentLabel',
            defaultMessage: 'Agent',
        },
        yoloModeLabel: {
            id: 'settings.yoloModeLabel',
            defaultMessage: 'Yolo mode',
        },
        yoloModeHint: {
            id: 'settings.yoloModeHint',
            defaultMessage: 'Default new sessions to auto-approve agent commands.',
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
    },
    { typed: true },
);
