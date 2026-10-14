export type QuickPrompt = {
    id: string;
    /** Short label shown in the palette list. */
    label: string;
    /** Full prompt text (used when a prompt is selected). */
    text: string;
};

export const QUICK_PROMPTS: readonly QuickPrompt[] = [];
