export type PanelResizeHandleProps = {
    ariaLabel: string;
    edge: 'leading' | 'trailing';
    onResize: (deltaPx: number) => void;
    onResizeEnd?: () => void;
    className?: string;
};
