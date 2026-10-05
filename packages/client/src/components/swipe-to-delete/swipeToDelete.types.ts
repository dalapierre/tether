import type { ReactNode } from 'react';

export type SwipeToDeleteProps = {
    children: ReactNode;
    onDelete: () => void;
    disabled?: boolean;
};
