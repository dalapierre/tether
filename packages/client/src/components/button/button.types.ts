import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary';

export type ButtonProps = {
    children: ReactNode;
    variant?: ButtonVariant;
    type?: ButtonHTMLAttributes<HTMLButtonElement>['type'];
    disabled?: boolean;
    onClick?: ButtonHTMLAttributes<HTMLButtonElement>['onClick'];
};
