import type { ReactNode } from 'react';

export type ToggleProps = {
    label: ReactNode;
    description?: ReactNode;
    checked: boolean;
    disabled?: boolean;
    onChange: (checked: boolean) => void;
};
