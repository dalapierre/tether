export type TerminalSelectionExplain = {
    content: string;
    top: number;
    left: number;
    placeAbove: boolean;
};

type SelectionPosition = {
    start: { x: number; y: number };
    end: { x: number; y: number };
};

/**
 * Map an xterm buffer selection into overlay coordinates inside `overlayContainer`.
 * Returns null when there is no usable selection or the selection is off-screen.
 */
export function readTerminalSelectionExplain(options: {
    selection: string;
    position: SelectionPosition | undefined;
    viewportY: number;
    cols: number;
    rows: number;
    screenWidth: number;
    screenHeight: number;
    screenOffsetLeft: number;
    screenOffsetTop: number;
    overlayWidth: number;
    overlayHeight: number;
}): TerminalSelectionExplain | null {
    const content = options.selection;
    if (!content.trim() || !options.position) return null;
    if (options.cols <= 0 || options.rows <= 0) return null;

    const cellWidth = options.screenWidth / options.cols;
    const cellHeight = options.screenHeight / options.rows;
    if (!Number.isFinite(cellWidth) || !Number.isFinite(cellHeight) || cellWidth <= 0 || cellHeight <= 0) {
        return null;
    }

    const startRow = options.position.start.y - options.viewportY;
    if (startRow < -1 || startRow > options.rows) return null;

    const selectionTop = options.screenOffsetTop + startRow * cellHeight;
    const selectionLeft = options.screenOffsetLeft + options.position.start.x * cellWidth;

    const buttonHeight = 36;
    const buttonWidth = 96;
    const gap = 4;
    const edgePad = 8;
    const placeAbove = selectionTop >= buttonHeight + gap;
    const maxLeft = Math.max(edgePad, options.overlayWidth - buttonWidth - edgePad);
    const left = Math.min(Math.max(edgePad, selectionLeft), maxLeft);
    const top = placeAbove ? selectionTop - gap : selectionTop + cellHeight + gap;

    if (top < -buttonHeight || top > options.overlayHeight + buttonHeight) {
        return null;
    }

    return { content, top, left, placeAbove };
}
