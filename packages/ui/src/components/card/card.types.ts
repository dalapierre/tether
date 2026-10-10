import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type CardIndicator = 'ready' | 'busy' | 'error';

export type CardProps = {
    title: string;
    children?: ReactNode;
    onClick?: ButtonHTMLAttributes<HTMLButtonElement>['onClick'];
    indicator?: CardIndicator;
    selected?: boolean;
    onRestart?: () => void;
    restartLabel?: string;
    restartDisabled?: boolean;
};
