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
    profileLabel: NoMessageValues;
    profilePlaceholder: NoMessageValues;
    profilesEmpty: NoMessageValues;
    profileNoResults: NoMessageValues;
    projectLabel: NoMessageValues;
    projectPlaceholder: NoMessageValues;
    projectsEmpty: NoMessageValues;
    projectNoResults: NoMessageValues;
    branchLabel: NoMessageValues;
    branchPlaceholder: NoMessageValues;
    advancedToggle: NoMessageValues;
    workingDirectoryLabel: NoMessageValues;
    workingDirectoryPlaceholder: NoMessageValues;
    workingDirectoryEmpty: NoMessageValues;
    workingDirectoryNoResults: NoMessageValues;
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
        profileLabel: {
            id: 'newSession.profileLabel',
            defaultMessage: 'Profile',
        },
        profilePlaceholder: {
            id: 'newSession.profilePlaceholder',
            defaultMessage: 'Search profiles…',
        },
        profilesEmpty: {
            id: 'newSession.profilesEmpty',
            defaultMessage: 'No profiles available. Add one in Settings.',
        },
        profileNoResults: {
            id: 'newSession.profileNoResults',
            defaultMessage: 'No matching profiles.',
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
            defaultMessage: 'No repositories available. Add one in Settings.',
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
