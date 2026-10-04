import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type IconButtonProps = {
    label: string;
    children: ReactNode;
    onClick?: ButtonHTMLAttributes<HTMLButtonElement>['onClick'];
    disabled?: boolean;
    type?: ButtonHTMLAttributes<HTMLButtonElement>['type'];
};
