import { defineMessages, type NoMessageValues } from 'react-intl';

type Messages = {
    workspace: NoMessageValues;
    searchPlaceholder: NoMessageValues;
    searchAriaLabel: NoMessageValues;
    clearSearch: NoMessageValues;
    noMatchingSessions: NoMessageValues;
    noSessionsYet: NoMessageValues;
    loadingSessions: NoMessageValues;
    newSession: NoMessageValues;
    create: NoMessageValues;
    createMenu: NoMessageValues;
    createSession: NoMessageValues;
    createTerminal: NoMessageValues;
    createQuickPrompt: NoMessageValues;
    settings: NoMessageValues;
    sessionsHeading: NoMessageValues;
    sessionList: NoMessageValues;
    quickPromptList: NoMessageValues;
    quickPromptsHeading: NoMessageValues;
    searchQuickPromptsPlaceholder: NoMessageValues;
    searchQuickPromptsAriaLabel: NoMessageValues;
    noQuickPrompts: NoMessageValues;
    noMatchingQuickPrompts: NoMessageValues;
    loadingQuickPrompts: NoMessageValues;
    quickPromptActions: NoMessageValues;
    deleteQuickPrompt: NoMessageValues;
    deleteQuickPromptConfirm: { name: string };
    deleteQuickPromptFailed: NoMessageValues;
    conversationSession: NoMessageValues;
    branchLabel: { branch: string };
    cpuLabel: { percent: number };
    ramLabel: { percent: number };
    sessionActions: NoMessageValues;
    deleteSession: NoMessageValues;
    deleteConfirm: { name: string };
    deleteConfirmContinue: NoMessageValues;
    deleteConfirmCancel: NoMessageValues;
    deleteFailed: NoMessageValues;
    restartSession: NoMessageValues;
    restartFailed: NoMessageValues;
    initializing: NoMessageValues;
};

export const messages = defineMessages<Messages>(
    {
        workspace: {
            id: 'sessionsPanel.workspace',
            defaultMessage: 'Workspace',
        },
        searchPlaceholder: {
            id: 'sessionsPanel.searchPlaceholder',
            defaultMessage: 'Search sessions…',
        },
        searchAriaLabel: {
            id: 'sessionsPanel.searchAriaLabel',
            defaultMessage: 'Search sessions',
        },
        clearSearch: {
            id: 'sessionsPanel.clearSearch',
            defaultMessage: 'Clear search',
        },
        noMatchingSessions: {
            id: 'sessionsPanel.noMatchingSessions',
            defaultMessage: 'No matching sessions',
        },
        noSessionsYet: {
            id: 'sessionsPanel.noSessionsYet',
            defaultMessage: 'No session yet',
        },
        loadingSessions: {
            id: 'sessionsPanel.loadingSessions',
            defaultMessage: 'Loading sessions…',
        },
        newSession: {
            id: 'sessionsPanel.newSession',
            defaultMessage: 'New session',
        },
        create: {
            id: 'sessionsPanel.create',
            defaultMessage: 'Add',
        },
        createMenu: {
            id: 'sessionsPanel.createMenu',
            defaultMessage: 'Add',
        },
        createSession: {
            id: 'sessionsPanel.createSession',
            defaultMessage: 'Session',
        },
        createTerminal: {
            id: 'sessionsPanel.createTerminal',
            defaultMessage: 'Terminal',
        },
        createQuickPrompt: {
            id: 'sessionsPanel.createQuickPrompt',
            defaultMessage: 'Quick prompt',
        },
        settings: {
            id: 'sessionsPanel.settings',
            defaultMessage: 'Settings',
        },
        sessionsHeading: {
            id: 'sessionsPanel.sessionsHeading',
            defaultMessage: 'Sessions',
        },
        sessionList: {
            id: 'sessionsPanel.sessionList',
            defaultMessage: 'Session list',
        },
        quickPromptList: {
            id: 'sessionsPanel.quickPromptList',
            defaultMessage: 'Quick prompt list',
        },
        quickPromptsHeading: {
            id: 'sessionsPanel.quickPromptsHeading',
            defaultMessage: 'Quick prompts',
        },
        searchQuickPromptsPlaceholder: {
            id: 'sessionsPanel.searchQuickPromptsPlaceholder',
            defaultMessage: 'Search prompts…',
        },
        searchQuickPromptsAriaLabel: {
            id: 'sessionsPanel.searchQuickPromptsAriaLabel',
            defaultMessage: 'Search quick prompts',
        },
        noQuickPrompts: {
            id: 'sessionsPanel.noQuickPrompts',
            defaultMessage: 'No quick prompts yet',
        },
        noMatchingQuickPrompts: {
            id: 'sessionsPanel.noMatchingQuickPrompts',
            defaultMessage: 'No matching prompts',
        },
        loadingQuickPrompts: {
            id: 'sessionsPanel.loadingQuickPrompts',
            defaultMessage: 'Loading prompts…',
        },
        quickPromptActions: {
            id: 'sessionsPanel.quickPromptActions',
            defaultMessage: 'Quick prompt actions',
        },
        deleteQuickPrompt: {
            id: 'sessionsPanel.deleteQuickPrompt',
            defaultMessage: 'Delete',
        },
        deleteQuickPromptConfirm: {
            id: 'sessionsPanel.deleteQuickPromptConfirm',
            defaultMessage: 'Are you sure you want to delete {name}?',
        },
        deleteQuickPromptFailed: {
            id: 'sessionsPanel.deleteQuickPromptFailed',
            defaultMessage: 'Failed to delete quick prompt',
        },
        conversationSession: {
            id: 'sessionsPanel.conversationSession',
            defaultMessage: 'Conversation',
        },
        branchLabel: {
            id: 'sessionsPanel.branchLabel',
            defaultMessage: '{branch}',
        },
        cpuLabel: {
            id: 'sessionsPanel.cpuLabel',
            defaultMessage: 'CPU {percent}%',
        },
        ramLabel: {
            id: 'sessionsPanel.ramLabel',
            defaultMessage: 'RAM {percent}%',
        },
        sessionActions: {
            id: 'sessionsPanel.sessionActions',
            defaultMessage: 'Session actions',
        },
        deleteSession: {
            id: 'sessionsPanel.deleteSession',
            defaultMessage: 'Delete',
        },
        deleteConfirm: {
            id: 'sessionsPanel.deleteConfirm',
            defaultMessage: 'Are you sure you want to delete {name}? All data related to this session will be lost.',
        },
        deleteConfirmContinue: {
            id: 'sessionsPanel.deleteConfirmContinue',
            defaultMessage: 'Continue',
        },
        deleteConfirmCancel: {
            id: 'sessionsPanel.deleteConfirmCancel',
            defaultMessage: 'Cancel',
        },
        deleteFailed: {
            id: 'sessionsPanel.deleteFailed',
            defaultMessage: 'Failed to delete session',
        },
        restartSession: {
            id: 'sessionsPanel.restartSession',
            defaultMessage: 'Restart session',
        },
        restartFailed: {
            id: 'sessionsPanel.restartFailed',
            defaultMessage: 'Failed to restart session',
        },
        initializing: {
            id: 'sessionsPanel.initializing',
            defaultMessage: 'Initializing',
        },
    },
    { typed: true },
);
