export type PanelResizeHandleProps = {
    ariaLabel: string;
    /**
     * `horizontal` — left/right panel splitter (default).
     * `vertical` — top/bottom panel splitter.
     */
    orientation?: 'horizontal' | 'vertical';
    /**
     * `edge` — absolutely positioned on a panel edge (default; used by nested splits).
     * `gap` — in-flow gutter between panels; the handle itself is the visual gap.
     */
    placement?: 'edge' | 'gap';
    /** For edge placement. Horizontal: leading=left, trailing=right. Vertical: leading=top, trailing=bottom. */
    edge?: 'leading' | 'trailing';
    onResize: (deltaPx: number) => void;
    /** Fires once when the pointer captures and a drag begins. */
    onResizeStart?: () => void;
    onResizeEnd?: () => void;
    className?: string;
};
