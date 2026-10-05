import { defineMessages, type NoMessageValues } from 'react-intl';

type Messages = {
    ariaLabel: NoMessageValues;
    crumb: NoMessageValues;
    close: NoMessageValues;
    loading: NoMessageValues;
    loadFailed: NoMessageValues;
    saveFailed: NoMessageValues;
    categoryGeneral: NoMessageValues;
    categoryGeneralCrumb: NoMessageValues;
    categoryGeneralDescription: NoMessageValues;
    categoryRepos: NoMessageValues;
    categoryReposCrumb: NoMessageValues;
    categoryReposDescription: NoMessageValues;
    categoryAgents: NoMessageValues;
    categoryAgentsCrumb: NoMessageValues;
    categoryAgentsDescription: NoMessageValues;
    devDirLabel: NoMessageValues;
    devDirPlaceholder: NoMessageValues;
    devDirHint: NoMessageValues;
    repositoriesLabel: NoMessageValues;
    repositoriesEmpty: NoMessageValues;
    repositoriesLoadFailed: NoMessageValues;
    addRepositoryLabel: NoMessageValues;
    addRepositoryPlaceholder: NoMessageValues;
    addRepositoryEmpty: NoMessageValues;
    addRepositoryNoResults: NoMessageValues;
    addRepositoryFailed: NoMessageValues;
    removeRepository: NoMessageValues;
    removeRepositoryConfirm: { name: string };
    removeRepositoryConfirmContinue: NoMessageValues;
    removeRepositoryConfirmCancel: NoMessageValues;
    removeRepositoryFailed: NoMessageValues;
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
        categoryGeneral: {
            id: 'settings.categoryGeneral',
            defaultMessage: 'General',
        },
        categoryGeneralCrumb: {
            id: 'settings.categoryGeneralCrumb',
            defaultMessage: 'general',
        },
        categoryGeneralDescription: {
            id: 'settings.categoryGeneralDescription',
            defaultMessage: 'Development directory and workspace defaults.',
        },
        categoryRepos: {
            id: 'settings.categoryRepos',
            defaultMessage: 'Repositories',
        },
        categoryReposCrumb: {
            id: 'settings.categoryReposCrumb',
            defaultMessage: 'repositories',
        },
        categoryReposDescription: {
            id: 'settings.categoryReposDescription',
            defaultMessage: 'Choose which git repositories appear in Tether.',
        },
        categoryAgents: {
            id: 'settings.categoryAgents',
            defaultMessage: 'Agents',
        },
        categoryAgentsCrumb: {
            id: 'settings.categoryAgentsCrumb',
            defaultMessage: 'agents',
        },
        categoryAgentsDescription: {
            id: 'settings.categoryAgentsDescription',
            defaultMessage: 'Default agent and approval behavior for new sessions.',
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
        repositoriesLabel: {
            id: 'settings.repositoriesLabel',
            defaultMessage: 'Repositories',
        },
        repositoriesEmpty: {
            id: 'settings.repositoriesEmpty',
            defaultMessage: 'No repositories yet. Add one from your development directory.',
        },
        repositoriesLoadFailed: {
            id: 'settings.repositoriesLoadFailed',
            defaultMessage: 'Failed to load repositories',
        },
        addRepositoryLabel: {
            id: 'settings.addRepositoryLabel',
            defaultMessage: 'Add repository',
        },
        addRepositoryPlaceholder: {
            id: 'settings.addRepositoryPlaceholder',
            defaultMessage: 'Search repositories…',
        },
        addRepositoryEmpty: {
            id: 'settings.addRepositoryEmpty',
            defaultMessage: 'No new repositories found in the development directory.',
        },
        addRepositoryNoResults: {
            id: 'settings.addRepositoryNoResults',
            defaultMessage: 'No matching repositories.',
        },
        addRepositoryFailed: {
            id: 'settings.addRepositoryFailed',
            defaultMessage: 'Failed to add repository',
        },
        removeRepository: {
            id: 'settings.removeRepository',
            defaultMessage: 'Remove',
        },
        removeRepositoryConfirm: {
            id: 'settings.removeRepositoryConfirm',
            defaultMessage: 'Remove {name} from Tether? All existing sessions for this repository will be deleted.',
        },
        removeRepositoryConfirmContinue: {
            id: 'settings.removeRepositoryConfirmContinue',
            defaultMessage: 'Remove',
        },
        removeRepositoryConfirmCancel: {
            id: 'settings.removeRepositoryConfirmCancel',
            defaultMessage: 'Cancel',
        },
        removeRepositoryFailed: {
            id: 'settings.removeRepositoryFailed',
            defaultMessage: 'Failed to remove repository',
        },
        agentLabel: {
            id: 'settings.agentLabel',
            defaultMessage: 'Default harness',
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
