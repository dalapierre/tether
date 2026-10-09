import type { ReactNode } from 'react';

export type PaneToolbarProps = {
    /** Primary label shown on the left (truncated). */
    title: ReactNode;
    /** Optional control before the title (e.g. back button). */
    leading?: ReactNode;
    /** Actions aligned to the right. */
    children?: ReactNode;
    className?: string;
};
