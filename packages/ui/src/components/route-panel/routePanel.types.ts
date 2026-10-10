import type { ReactNode } from 'react';

export type RoutePanelCrumb = {
    label: string;
    onClick?: () => void;
};

export type RoutePanelProps = {
    children: ReactNode;
    /** Simple top-bar label. Ignored when `crumbs` is set. */
    title?: ReactNode;
    /** Breadcrumb path shown in the top bar. */
    crumbs?: RoutePanelCrumb[];
    onClose: () => void;
    closeLabel: string;
    closeDisabled?: boolean;
    /** When set, shows a back control before the title. */
    onBack?: () => void;
    backLabel?: string;
    /** Optional control before the title (e.g. custom leading). Overrides `onBack` when set. */
    toolbarLeading?: ReactNode;
    /** Optional footer pinned below the scrollable body (e.g. primary action). */
    footer?: ReactNode;
    /** Optional overlay drawn above the panel (e.g. busy state). */
    overlay?: ReactNode;
    'aria-label'?: string;
    className?: string;
};
