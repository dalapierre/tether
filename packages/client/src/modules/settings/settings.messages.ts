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
    categoryProfiles: NoMessageValues;
    categoryProfilesCrumb: NoMessageValues;
    categoryProfilesDescription: NoMessageValues;
    categoryNewProfileCrumb: NoMessageValues;
    categoryEditProfileCrumb: NoMessageValues;
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
    defaultProfileLabel: NoMessageValues;
    profilesLabel: NoMessageValues;
    profilesEmpty: NoMessageValues;
    addProfile: NoMessageValues;
    createProfile: NoMessageValues;
    creatingProfile: NoMessageValues;
    createProfileFailed: NoMessageValues;
    removeProfile: NoMessageValues;
    removeProfileConfirm: { name: string };
    removeProfileConfirmContinue: NoMessageValues;
    removeProfileConfirmCancel: NoMessageValues;
    removeProfileFailed: NoMessageValues;
    profileNameLabel: NoMessageValues;
    profileNamePlaceholder: NoMessageValues;
    profileNameRequired: NoMessageValues;
    profileTypeLabel: NoMessageValues;
    profileTypeCoding: NoMessageValues;
    profileTypeConversation: NoMessageValues;
    profileHarnessLabel: NoMessageValues;
    profileYoloModeLabel: NoMessageValues;
    profileYoloModeHint: NoMessageValues;
    profileUseWorktreesLabel: NoMessageValues;
    profileUseWorktreesHint: NoMessageValues;
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
            defaultMessage: 'Agent profiles and defaults for new sessions.',
        },
        categoryProfiles: {
            id: 'settings.categoryProfiles',
            defaultMessage: 'Profiles',
        },
        categoryProfilesCrumb: {
            id: 'settings.categoryProfilesCrumb',
            defaultMessage: 'profiles',
        },
        categoryProfilesDescription: {
            id: 'settings.categoryProfilesDescription',
            defaultMessage: 'Create and manage agent profiles.',
        },
        categoryNewProfileCrumb: {
            id: 'settings.categoryNewProfileCrumb',
            defaultMessage: 'new profile',
        },
        categoryEditProfileCrumb: {
            id: 'settings.categoryEditProfileCrumb',
            defaultMessage: 'edit profile',
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
        defaultProfileLabel: {
            id: 'settings.defaultProfileLabel',
            defaultMessage: 'Default profile',
        },
        profilesLabel: {
            id: 'settings.profilesLabel',
            defaultMessage: 'Profiles',
        },
        profilesEmpty: {
            id: 'settings.profilesEmpty',
            defaultMessage: 'No profiles yet. Add one to get started.',
        },
        addProfile: {
            id: 'settings.addProfile',
            defaultMessage: 'Add profile',
        },
        createProfile: {
            id: 'settings.createProfile',
            defaultMessage: 'Create',
        },
        creatingProfile: {
            id: 'settings.creatingProfile',
            defaultMessage: 'Creating…',
        },
        createProfileFailed: {
            id: 'settings.createProfileFailed',
            defaultMessage: 'Failed to create profile',
        },
        removeProfile: {
            id: 'settings.removeProfile',
            defaultMessage: 'Remove',
        },
        removeProfileConfirm: {
            id: 'settings.removeProfileConfirm',
            defaultMessage: 'Remove profile {name}?',
        },
        removeProfileConfirmContinue: {
            id: 'settings.removeProfileConfirmContinue',
            defaultMessage: 'Remove',
        },
        removeProfileConfirmCancel: {
            id: 'settings.removeProfileConfirmCancel',
            defaultMessage: 'Cancel',
        },
        removeProfileFailed: {
            id: 'settings.removeProfileFailed',
            defaultMessage: 'Failed to remove profile',
        },
        profileNameLabel: {
            id: 'settings.profileNameLabel',
            defaultMessage: 'Name',
        },
        profileNamePlaceholder: {
            id: 'settings.profileNamePlaceholder',
            defaultMessage: 'Profile name',
        },
        profileNameRequired: {
            id: 'settings.profileNameRequired',
            defaultMessage: 'Profile name is required.',
        },
        profileTypeLabel: {
            id: 'settings.profileTypeLabel',
            defaultMessage: 'Type',
        },
        profileTypeCoding: {
            id: 'settings.profileTypeCoding',
            defaultMessage: 'Coding',
        },
        profileTypeConversation: {
            id: 'settings.profileTypeConversation',
            defaultMessage: 'Conversation',
        },
        profileHarnessLabel: {
            id: 'settings.profileHarnessLabel',
            defaultMessage: 'Harness',
        },
        profileYoloModeLabel: {
            id: 'settings.profileYoloModeLabel',
            defaultMessage: 'Yolo mode',
        },
        profileYoloModeHint: {
            id: 'settings.profileYoloModeHint',
            defaultMessage: 'Auto-approve agent commands for sessions using this profile.',
        },
        profileUseWorktreesLabel: {
            id: 'settings.profileUseWorktreesLabel',
            defaultMessage: 'Use worktrees',
        },
        profileUseWorktreesHint: {
            id: 'settings.profileUseWorktreesHint',
            defaultMessage: 'When off, sessions run directly in the repository instead of a separate worktree.',
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
