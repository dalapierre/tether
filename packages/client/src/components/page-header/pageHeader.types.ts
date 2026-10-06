import type { ReactNode } from 'react';

export type PageHeaderCrumb = {
    label: string;
    to?: string;
    onClick?: () => void;
};

export type PageHeaderProps = {
    crumbs?: PageHeaderCrumb[];
    actions?: ReactNode;
    showSettings?: boolean;
    /** When set, shows a back control at the start of the header. */
    onBack?: () => void;
};
