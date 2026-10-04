export type NewSessionDraft = {
    name: string;
    agent: string;
};

export type NewSessionProps = {
    projectName: string;
    onClose: () => void;
    onStarted: (session: NewSessionDraft) => void;
};
