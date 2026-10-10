import type { Session } from '@ui/libs/api/sessions';

export type NewSessionProps = {
    onClose: () => void;
    onStarted: (session: Session) => void;
};
