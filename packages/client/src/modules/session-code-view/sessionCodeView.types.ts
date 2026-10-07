export type SessionCodeViewProps = {
    sessionId: string;
    onHasFilesChange?: (hasFiles: boolean) => void;
    /** When false, code-review keybinds are ignored (e.g. review pane hidden). */
    keybindsEnabled?: boolean;
    /** Submit a prompt to the agent session terminal. */
    onSubmitAgentPrompt?: (text: string) => void;
};
