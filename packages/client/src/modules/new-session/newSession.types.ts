import type { Session } from '@client/libs/api/sessions';

export type NewSessionProps = {
    onClose: () => void;
    onStarted: (session: Session) => void;
};
