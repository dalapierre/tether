import { describe, expect, it } from '@jest/globals';
import { readTerminalSelectionExplain } from './selectionExplain';

describe('readTerminalSelectionExplain', () => {
    const base = {
        selection: 'Error: boom',
        position: { start: { x: 2, y: 10 }, end: { x: 12, y: 10 } },
        viewportY: 8,
        cols: 80,
        rows: 24,
        screenWidth: 800,
        screenHeight: 480,
        screenOffsetLeft: 8,
        screenOffsetTop: 8,
        overlayWidth: 816,
        overlayHeight: 496,
    };

    it('places the button above the selection when there is room', () => {
        const result = readTerminalSelectionExplain(base);
        expect(result).toEqual({
            content: 'Error: boom',
            // row 10 - viewport 8 = 2 → 8 + 2*20 = 48; placeAbove → 48 - 4
            top: 44,
            // 8 + 2*10 = 28
            left: 28,
            placeAbove: true,
        });
    });

    it('places the button below when the selection is near the top', () => {
        const result = readTerminalSelectionExplain({
            ...base,
            position: { start: { x: 0, y: 8 }, end: { x: 4, y: 8 } },
        });
        expect(result?.placeAbove).toBe(false);
        expect(result?.top).toBe(8 + 20 + 4);
    });

    it('returns null for empty or missing selection', () => {
        expect(readTerminalSelectionExplain({ ...base, selection: '   ' })).toBeNull();
        expect(readTerminalSelectionExplain({ ...base, position: undefined })).toBeNull();
    });
});
