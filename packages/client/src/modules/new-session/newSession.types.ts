import type { Session } from '@client/libs/api/sessions';

export type NewSessionProps = {
    projectName: string;
    repositoryId: string;
    onClose: () => void;
    onStarted: (session: Session) => void;
};
