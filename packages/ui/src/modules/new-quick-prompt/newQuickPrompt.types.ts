import type { QuickPrompt } from '@ui/libs/api/quickPrompts';

export type NewQuickPromptProps = {
    onClose: () => void;
    onCreated?: () => void;
    onSaved?: () => void;
    /** When set, the panel edits this prompt and the primary action is Save. */
    prompt?: QuickPrompt;
};
