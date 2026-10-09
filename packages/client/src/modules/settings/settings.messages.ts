import { defineMessages, type NoMessageValues } from 'react-intl';

type Messages = {
    ariaLabel: NoMessageValues;
    crumb: NoMessageValues;
    close: NoMessageValues;
    loading: NoMessageValues;
    loadFailed: NoMessageValues;
    saveFailed: NoMessageValues;
    rootTitle: NoMessageValues;
    rootDescription: NoMessageValues;
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
    categoryNewProfile: NoMessageValues;
    categoryNewProfileCrumb: NoMessageValues;
    categoryNewProfileDescription: NoMessageValues;
    categoryEditProfile: NoMessageValues;
    categoryEditProfileCrumb: NoMessageValues;
    categoryEditProfileDescription: NoMessageValues;
    categoryKeybinds: NoMessageValues;
    categoryKeybindsCrumb: NoMessageValues;
    categoryKeybindsDescription: NoMessageValues;
    keybindsTabsLabel: NoMessageValues;
    keybindsTabHome: NoMessageValues;
    keybindsTabSession: NoMessageValues;
    keybindsHint: NoMessageValues;
    keybindRecording: NoMessageValues;
    keybindUnbound: NoMessageValues;
    keybindConflict: NoMessageValues;
    keybindNewSession: NoMessageValues;
    keybindOpenSettings: NoMessageValues;
    keybindFocusSearch: NoMessageValues;
    keybindPreviousSession: NoMessageValues;
    keybindNextSession: NoMessageValues;
    keybindDeleteSession: NoMessageValues;
    keybindRestartSession: NoMessageValues;
    keybindGoBack: NoMessageValues;
    keybindToggleReview: NoMessageValues;
    keybindReviewFullscreen: NoMessageValues;
    keybindToggleTerminal: NoMessageValues;
    keybindEnterAgentInsert: NoMessageValues;
    keybindExitAgentInsert: NoMessageValues;
    keybindEnterShellInsert: NoMessageValues;
    keybindNextFile: NoMessageValues;
    keybindPreviousFile: NoMessageValues;
    keybindDiscardFile: NoMessageValues;
    keybindCommentSelection: NoMessageValues;
    keybindScrollFileUp: NoMessageValues;
    keybindScrollFileDown: NoMessageValues;
    keybindScrollSpeedModifier: NoMessageValues;
    keybindToggleMarkdownPreview: NoMessageValues;
    keybindMarkFileReviewed: NoMessageValues;
    keybindDiffViewSplit: NoMessageValues;
    keybindDiffViewNegative: NoMessageValues;
    keybindDiffViewPositive: NoMessageValues;
    devDirLabel: NoMessageValues;
    devDirPlaceholder: NoMessageValues;
    devDirHint: NoMessageValues;
    toastDurationLabel: NoMessageValues;
    toastDurationHint: NoMessageValues;
    authTokenExpirationLabel: NoMessageValues;
    authTokenExpirationHint: NoMessageValues;
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
    defaultHarnessLabel: NoMessageValues;
    harnessesEmpty: NoMessageValues;
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
    profileHarnessLabel: NoMessageValues;
    profileYoloModeLabel: NoMessageValues;
    profileYoloModeHint: NoMessageValues;
    profileUseWorktreesLabel: NoMessageValues;
    profileUseWorktreesHint: NoMessageValues;
    signOut: NoMessageValues;
    saving: NoMessageValues;
    save: NoMessageValues;
    cancel: NoMessageValues;
    discardChangesConfirm: NoMessageValues;
    discardChangesConfirmContinue: NoMessageValues;
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
        rootTitle: {
            id: 'settings.rootTitle',
            defaultMessage: 'Settings',
        },
        rootDescription: {
            id: 'settings.rootDescription',
            defaultMessage: 'Configure how Tether runs on this machine.',
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
        categoryNewProfile: {
            id: 'settings.categoryNewProfile',
            defaultMessage: 'New profile',
        },
        categoryNewProfileCrumb: {
            id: 'settings.categoryNewProfileCrumb',
            defaultMessage: 'new profile',
        },
        categoryNewProfileDescription: {
            id: 'settings.categoryNewProfileDescription',
            defaultMessage: 'Create an agent profile for new sessions.',
        },
        categoryEditProfile: {
            id: 'settings.categoryEditProfile',
            defaultMessage: 'Edit profile',
        },
        categoryEditProfileCrumb: {
            id: 'settings.categoryEditProfileCrumb',
            defaultMessage: 'edit profile',
        },
        categoryEditProfileDescription: {
            id: 'settings.categoryEditProfileDescription',
            defaultMessage: 'Update this profile’s harness and defaults.',
        },
        categoryKeybinds: {
            id: 'settings.categoryKeybinds',
            defaultMessage: 'Keybinds',
        },
        categoryKeybindsCrumb: {
            id: 'settings.categoryKeybindsCrumb',
            defaultMessage: 'keybinds',
        },
        categoryKeybindsDescription: {
            id: 'settings.categoryKeybindsDescription',
            defaultMessage: 'Keyboard shortcuts for each part of the app.',
        },
        keybindsTabsLabel: {
            id: 'settings.keybindsTabsLabel',
            defaultMessage: 'Keybind categories',
        },
        keybindsTabHome: {
            id: 'settings.keybindsTabHome',
            defaultMessage: 'Sessions',
        },
        keybindsTabSession: {
            id: 'settings.keybindsTabSession',
            defaultMessage: 'Session',
        },
        keybindsHint: {
            id: 'settings.keybindsHint',
            defaultMessage: 'Click a shortcut, then press the new keys. Escape cancels. Backspace clears.',
        },
        keybindRecording: {
            id: 'settings.keybindRecording',
            defaultMessage: 'Press keys…',
        },
        keybindUnbound: {
            id: 'settings.keybindUnbound',
            defaultMessage: 'None',
        },
        keybindConflict: {
            id: 'settings.keybindConflict',
            defaultMessage: 'Conflicts with another shortcut on this tab',
        },
        keybindNewSession: {
            id: 'settings.keybindNewSession',
            defaultMessage: 'New session',
        },
        keybindOpenSettings: {
            id: 'settings.keybindOpenSettings',
            defaultMessage: 'Open settings',
        },
        keybindFocusSearch: {
            id: 'settings.keybindFocusSearch',
            defaultMessage: 'Search session',
        },
        keybindPreviousSession: {
            id: 'settings.keybindPreviousSession',
            defaultMessage: 'Previous session',
        },
        keybindNextSession: {
            id: 'settings.keybindNextSession',
            defaultMessage: 'Next session',
        },
        keybindDeleteSession: {
            id: 'settings.keybindDeleteSession',
            defaultMessage: 'Delete session',
        },
        keybindRestartSession: {
            id: 'settings.keybindRestartSession',
            defaultMessage: 'Restart session',
        },
        keybindGoBack: {
            id: 'settings.keybindGoBack',
            defaultMessage: 'Back to sessions',
        },
        keybindToggleReview: {
            id: 'settings.keybindToggleReview',
            defaultMessage: 'Toggle review panel',
        },
        keybindReviewFullscreen: {
            id: 'settings.keybindReviewFullscreen',
            defaultMessage: 'Fullscreen review',
        },
        keybindToggleTerminal: {
            id: 'settings.keybindToggleTerminal',
            defaultMessage: 'Toggle terminal panel',
        },
        keybindEnterAgentInsert: {
            id: 'settings.keybindEnterAgentInsert',
            defaultMessage: 'Enter agent insert',
        },
        keybindExitAgentInsert: {
            id: 'settings.keybindExitAgentInsert',
            defaultMessage: 'Leave agent insert',
        },
        keybindEnterShellInsert: {
            id: 'settings.keybindEnterShellInsert',
            defaultMessage: 'Enter shell insert',
        },
        keybindNextFile: {
            id: 'settings.keybindNextFile',
            defaultMessage: 'Next file',
        },
        keybindPreviousFile: {
            id: 'settings.keybindPreviousFile',
            defaultMessage: 'Previous file',
        },
        keybindDiscardFile: {
            id: 'settings.keybindDiscardFile',
            defaultMessage: 'Discard file changes',
        },
        keybindCommentSelection: {
            id: 'settings.keybindCommentSelection',
            defaultMessage: 'Comment on selection',
        },
        keybindScrollFileUp: {
            id: 'settings.keybindScrollFileUp',
            defaultMessage: 'Scroll file up',
        },
        keybindScrollFileDown: {
            id: 'settings.keybindScrollFileDown',
            defaultMessage: 'Scroll file down',
        },
        keybindScrollSpeedModifier: {
            id: 'settings.keybindScrollSpeedModifier',
            defaultMessage: 'Scroll speed modifier',
        },
        keybindToggleMarkdownPreview: {
            id: 'settings.keybindToggleMarkdownPreview',
            defaultMessage: 'Toggle markdown preview',
        },
        keybindMarkFileReviewed: {
            id: 'settings.keybindMarkFileReviewed',
            defaultMessage: 'Mark file as reviewed',
        },
        keybindDiffViewSplit: {
            id: 'settings.keybindDiffViewSplit',
            defaultMessage: 'Split diff view',
        },
        keybindDiffViewNegative: {
            id: 'settings.keybindDiffViewNegative',
            defaultMessage: 'Negative-only diff view',
        },
        keybindDiffViewPositive: {
            id: 'settings.keybindDiffViewPositive',
            defaultMessage: 'Positive-only diff view',
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
        toastDurationLabel: {
            id: 'settings.toastDurationLabel',
            defaultMessage: 'Toast duration',
        },
        toastDurationHint: {
            id: 'settings.toastDurationHint',
            defaultMessage: 'Seconds notifications stay on screen before dismissing (1–120).',
        },
        authTokenExpirationLabel: {
            id: 'settings.authTokenExpirationLabel',
            defaultMessage: 'Auth token expiration',
        },
        authTokenExpirationHint: {
            id: 'settings.authTokenExpirationHint',
            defaultMessage: 'Minutes before a login session expires and you must sign in again (1–1440).',
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
        defaultHarnessLabel: {
            id: 'settings.defaultHarnessLabel',
            defaultMessage: 'Default harness',
        },
        defaultProfileLabel: {
            id: 'settings.defaultProfileLabel',
            defaultMessage: 'Default profile',
        },
        harnessesEmpty: {
            id: 'settings.harnessesEmpty',
            defaultMessage: 'No CLI coding agents found on this machine.',
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
        cancel: {
            id: 'settings.cancel',
            defaultMessage: 'Cancel',
        },
        discardChangesConfirm: {
            id: 'settings.discardChangesConfirm',
            defaultMessage: 'Are you sure you want to discard your changes?',
        },
        discardChangesConfirmContinue: {
            id: 'settings.discardChangesConfirmContinue',
            defaultMessage: 'Discard',
        },
    },
    { typed: true },
);
