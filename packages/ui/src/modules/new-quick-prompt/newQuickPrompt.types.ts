import type { QuickPrompt } from '@ui/libs/api/quickPrompts';

export type NewQuickPromptProps = {
    /** Close the editor tab. Pass `{ force: true }` after a successful save. */
    onClose: (options?: { force?: boolean }) => void;
    onCreated?: () => void;
    onSaved?: () => void;
    /** When set, the panel edits this prompt and the primary action is Save. */
    prompt?: QuickPrompt;
};
