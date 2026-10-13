import { defineMessages, type NoMessageValues } from 'react-intl';

type Messages = {
    ariaLabel: NoMessageValues;
    close: NoMessageValues;
    loading: NoMessageValues;
    loadFailed: NoMessageValues;
    title: NoMessageValues;
    description: NoMessageValues;
    nameLabel: NoMessageValues;
    namePlaceholder: NoMessageValues;
    projectLabel: NoMessageValues;
    projectPlaceholder: NoMessageValues;
    projectsEmpty: NoMessageValues;
    projectNoResults: NoMessageValues;
    branchLabel: NoMessageValues;
    branchPlaceholder: NoMessageValues;
    advancedToggle: NoMessageValues;
    harnessLabel: NoMessageValues;
    harnessesEmpty: NoMessageValues;
    yoloModeLabel: NoMessageValues;
    yoloModeHint: NoMessageValues;
    useWorktreesLabel: NoMessageValues;
    useWorktreesHint: NoMessageValues;
    worktreesDirLabel: NoMessageValues;
    worktreesDirHint: NoMessageValues;
    workingDirectoryLabel: NoMessageValues;
    workingDirectoryPlaceholder: NoMessageValues;
    workingDirectoryEmpty: NoMessageValues;
    workingDirectoryNoResults: NoMessageValues;
    workingDirectoryLimit: NoMessageValues;
    workingDirectoryHint: NoMessageValues;
    start: NoMessageValues;
    starting: NoMessageValues;
    startFailed: NoMessageValues;
};

export const messages = defineMessages<Messages>(
    {
        ariaLabel: {
            id: 'newSession.ariaLabel',
            defaultMessage: 'New session',
        },
        close: {
            id: 'newSession.close',
            defaultMessage: 'Close',
        },
        loading: {
            id: 'newSession.loading',
            defaultMessage: 'Loading…',
        },
        loadFailed: {
            id: 'newSession.loadFailed',
            defaultMessage: 'Failed to load form',
        },
        title: {
            id: 'newSession.title',
            defaultMessage: 'New session',
        },
        description: {
            id: 'newSession.description',
            defaultMessage: 'Start an agent session on this machine.',
        },
        nameLabel: {
            id: 'newSession.nameLabel',
            defaultMessage: 'Name',
        },
        namePlaceholder: {
            id: 'newSession.namePlaceholder',
            defaultMessage: 'Session name',
        },
        projectLabel: {
            id: 'newSession.projectLabel',
            defaultMessage: 'Repository',
        },
        projectPlaceholder: {
            id: 'newSession.projectPlaceholder',
            defaultMessage: 'Search repositories…',
        },
        projectsEmpty: {
            id: 'newSession.projectsEmpty',
            defaultMessage: 'No repositories found. Set your workspace directory in Settings.',
        },
        projectNoResults: {
            id: 'newSession.projectNoResults',
            defaultMessage: 'No matching repositories.',
        },
        branchLabel: {
            id: 'newSession.branchLabel',
            defaultMessage: 'Branch',
        },
        branchPlaceholder: {
            id: 'newSession.branchPlaceholder',
            defaultMessage: 'Branch name',
        },
        advancedToggle: {
            id: 'newSession.advancedToggle',
            defaultMessage: 'Advanced',
        },
        harnessLabel: {
            id: 'newSession.harnessLabel',
            defaultMessage: 'Harness',
        },
        harnessesEmpty: {
            id: 'newSession.harnessesEmpty',
            defaultMessage: 'No harnesses available',
        },
        yoloModeLabel: {
            id: 'newSession.yoloModeLabel',
            defaultMessage: 'Yolo mode',
        },
        yoloModeHint: {
            id: 'newSession.yoloModeHint',
            defaultMessage: 'Auto-approve agent commands for this session.',
        },
        useWorktreesLabel: {
            id: 'newSession.useWorktreesLabel',
            defaultMessage: 'Use worktrees',
        },
        useWorktreesHint: {
            id: 'newSession.useWorktreesHint',
            defaultMessage: 'When off, the session runs directly in the repository instead of a separate worktree.',
        },
        worktreesDirLabel: {
            id: 'newSession.worktreesDirLabel',
            defaultMessage: 'Worktree location',
        },
        worktreesDirHint: {
            id: 'newSession.worktreesDirHint',
            defaultMessage: 'Parent directory for this session worktree. Leave empty to use the default.',
        },
        workingDirectoryLabel: {
            id: 'newSession.workingDirectoryLabel',
            defaultMessage: 'Working directory',
        },
        workingDirectoryPlaceholder: {
            id: 'newSession.workingDirectoryPlaceholder',
            defaultMessage: 'Search directories…',
        },
        workingDirectoryEmpty: {
            id: 'newSession.workingDirectoryEmpty',
            defaultMessage: 'Select a repository to browse directories.',
        },
        workingDirectoryNoResults: {
            id: 'newSession.workingDirectoryNoResults',
            defaultMessage: 'No matching directories.',
        },
        workingDirectoryLimit: {
            id: 'newSession.workingDirectoryLimit',
            defaultMessage: 'Showing the first matches. Type to narrow.',
        },
        workingDirectoryHint: {
            id: 'newSession.workingDirectoryHint',
            defaultMessage: 'Useful for large repos when you are only working in a specific domain.',
        },
        start: {
            id: 'newSession.start',
            defaultMessage: 'Start',
        },
        starting: {
            id: 'newSession.starting',
            defaultMessage: 'Starting…',
        },
        startFailed: {
            id: 'newSession.startFailed',
            defaultMessage: 'Failed to start session',
        },
    },
    { typed: true },
);
