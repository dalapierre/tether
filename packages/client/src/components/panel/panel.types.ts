import type { ComponentPropsWithoutRef, ReactNode, Ref } from 'react';

export type PanelProps = Omit<ComponentPropsWithoutRef<'div'>, 'title'> & {
    children: ReactNode;
    /** When set, renders a PaneToolbar above the panel body. */
    title?: ReactNode;
    toolbarLeading?: ReactNode;
    toolbarActions?: ReactNode;
    toolbarClassName?: string;
    ref?: Ref<HTMLDivElement>;
};
