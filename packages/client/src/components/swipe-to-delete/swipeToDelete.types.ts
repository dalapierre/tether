import type { ReactNode } from 'react';

export type SwipeToDeleteProps = {
    children: ReactNode;
    deleteLabel: string;
    onDelete: () => void;
    disabled?: boolean;
    /** When true, the delete action is revealed. */
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
};
