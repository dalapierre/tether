import { describe, expect, it } from '@jest/globals';
import { clampActiveIndex, stepActiveIndex } from './quickPromptNav';

describe('stepActiveIndex', () => {
    it('returns 0 for an empty list', () => {
        expect(stepActiveIndex(0, 0, 1)).toBe(0);
        expect(stepActiveIndex(2, 0, -1)).toBe(0);
    });

    it('wraps forward and backward', () => {
        expect(stepActiveIndex(0, 3, 1)).toBe(1);
        expect(stepActiveIndex(2, 3, 1)).toBe(0);
        expect(stepActiveIndex(0, 3, -1)).toBe(2);
        expect(stepActiveIndex(1, 3, -1)).toBe(0);
    });
});

describe('clampActiveIndex', () => {
    it('returns 0 for an empty list', () => {
        expect(clampActiveIndex(5, 0)).toBe(0);
    });

    it('clamps to the last valid index', () => {
        expect(clampActiveIndex(5, 3)).toBe(2);
        expect(clampActiveIndex(-1, 3)).toBe(0);
        expect(clampActiveIndex(1, 3)).toBe(1);
    });
});
