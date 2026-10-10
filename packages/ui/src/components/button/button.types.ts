import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary';

export type ButtonProps = {
    children: ReactNode;
    variant?: ButtonVariant;
    type?: ButtonHTMLAttributes<HTMLButtonElement>['type'];
    disabled?: boolean;
    fullWidth?: boolean;
    onClick?: ButtonHTMLAttributes<HTMLButtonElement>['onClick'];
};
