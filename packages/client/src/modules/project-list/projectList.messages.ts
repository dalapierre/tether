import { defineMessages, type MessageTag, type NoMessageValues } from 'react-intl';

type Messages = {
    projectsCrumb: NoMessageValues;
    loading: NoMessageValues;
    loadFailed: NoMessageValues;
    empty: { devDirLink: MessageTag };
    newProject: NoMessageValues;
};

export const messages = defineMessages<Messages>(
    {
        projectsCrumb: {
            id: 'projectList.projectsCrumb',
            defaultMessage: 'projects',
        },
        loading: {
            id: 'projectList.loading',
            defaultMessage: 'Loading projects…',
        },
        loadFailed: {
            id: 'projectList.loadFailed',
            defaultMessage: 'Failed to load projects',
        },
        empty: {
            id: 'projectList.empty',
            defaultMessage:
                'No projects yet. Tap New project to add a repository from your <devDirLink>development directory</devDirLink>.',
        },
        newProject: {
            id: 'projectList.newProject',
            defaultMessage: 'New project',
        },
    },
    { typed: true },
);
