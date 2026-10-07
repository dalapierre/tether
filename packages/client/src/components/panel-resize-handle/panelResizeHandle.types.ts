export type PanelResizeHandleProps = {
    ariaLabel: string;
    /**
     * `horizontal` — left/right panel splitter (default).
     * `vertical` — top/bottom panel splitter.
     */
    orientation?: 'horizontal' | 'vertical';
    /** For horizontal: leading=left, trailing=right. For vertical: leading=top, trailing=bottom. */
    edge: 'leading' | 'trailing';
    onResize: (deltaPx: number) => void;
    onResizeEnd?: () => void;
    className?: string;
};
