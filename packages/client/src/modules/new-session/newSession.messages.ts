import { defineMessages, type NoMessageValues } from 'react-intl';

type Messages = {
    ariaLabel: NoMessageValues;
    sessionsCrumb: NoMessageValues;
    crumb: NoMessageValues;
    close: NoMessageValues;
    loading: NoMessageValues;
    loadFailed: NoMessageValues;
    nameLabel: NoMessageValues;
    namePlaceholder: NoMessageValues;
    profileLabel: NoMessageValues;
    profilePlaceholder: NoMessageValues;
    profilesEmpty: NoMessageValues;
    profileNoResults: NoMessageValues;
    projectLabel: NoMessageValues;
    projectPlaceholder: NoMessageValues;
    projectsEmpty: NoMessageValues;
    branchLabel: NoMessageValues;
    branchPlaceholder: NoMessageValues;
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
        sessionsCrumb: {
            id: 'newSession.sessionsCrumb',
            defaultMessage: 'sessions',
        },
        crumb: {
            id: 'newSession.crumb',
            defaultMessage: 'new session',
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
            defaultMessage: 'Select a repository',
        },
        projectsEmpty: {
            id: 'newSession.projectsEmpty',
            defaultMessage: 'No repositories available. Add one in Settings.',
        },
        branchLabel: {
            id: 'newSession.branchLabel',
            defaultMessage: 'Branch',
        },
        branchPlaceholder: {
            id: 'newSession.branchPlaceholder',
            defaultMessage: 'Branch name',
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
