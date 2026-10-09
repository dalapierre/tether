export type SessionsPanelProps = {
    /** When false, the panel is not the primary surface (e.g. a session is open). */
    listInteractive?: boolean;
    /** Desktop: whether the sidebar is collapsed to the icon rail. */
    collapsed?: boolean;
    /** Last expanded width in px; keeps expanded content from reflowing while collapsing. */
    expandedWidth?: number;
    onCollapse?: () => void;
    onExpand?: () => void;
};
