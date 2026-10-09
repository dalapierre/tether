import type { ReactNode } from 'react';

export type PageHeaderCrumb = {
    label: string;
    to?: string;
    onClick?: () => void;
};

export type PageHeaderProps = {
    /** Bold page title. Prefer this over crumbs for simple headers. */
    title?: ReactNode;
    crumbs?: PageHeaderCrumb[];
    actions?: ReactNode;
    showSettings?: boolean;
    /** When false, hides the brand logo. Defaults to true. */
    showLogo?: boolean;
    /** When set, shows a back control at the start of the header. */
    onBack?: () => void;
};
