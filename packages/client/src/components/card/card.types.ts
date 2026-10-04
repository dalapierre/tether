import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type CardProps = {
    title: string;
    children?: ReactNode;
    onClick?: ButtonHTMLAttributes<HTMLButtonElement>['onClick'];
};
