export type SessionsPanelProps = {
    /** When false, the panel is not the primary surface (e.g. a session is open). */
    listInteractive?: boolean;
    /** Desktop: whether the session list panel is open between the rail and main content. */
    sessionListOpen?: boolean;
    onSessionListOpenChange?: (open: boolean) => void;
};
