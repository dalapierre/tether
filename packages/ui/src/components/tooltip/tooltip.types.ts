import type { ReactElement, ReactNode } from 'react';

export type TooltipSide = 'top' | 'bottom';

export type TooltipProps = {
    /** Visible tooltip text (or node). Empty / null disables the tooltip. */
    content: ReactNode;
    /** Single element that receives hover/focus. Prefer a focusable control. */
    children: ReactElement;
    /** Preferred side; flips if there is not enough viewport space. */
    side?: TooltipSide;
    /** Hover/focus delay before showing (ms). */
    delayMs?: number;
    disabled?: boolean;
};
