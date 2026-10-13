import {
    DEFAULT_TOAST_DURATION_SECONDS,
    MAX_TOAST_DURATION_SECONDS,
    MIN_TOAST_DURATION_SECONDS,
    normalizeToastDurationSeconds,
} from './store.js';

describe('normalizeToastDurationSeconds', () => {
    it('accepts finite values in range and rounds them', () => {
        expect(normalizeToastDurationSeconds(MIN_TOAST_DURATION_SECONDS)).toBe(MIN_TOAST_DURATION_SECONDS);
        expect(normalizeToastDurationSeconds(MAX_TOAST_DURATION_SECONDS)).toBe(MAX_TOAST_DURATION_SECONDS);
        expect(normalizeToastDurationSeconds(10.4)).toBe(10);
        expect(normalizeToastDurationSeconds(10.6)).toBe(11);
    });

    it('falls back to the default for out-of-range or invalid input', () => {
        expect(normalizeToastDurationSeconds(0)).toBe(DEFAULT_TOAST_DURATION_SECONDS);
        expect(normalizeToastDurationSeconds(121)).toBe(DEFAULT_TOAST_DURATION_SECONDS);
        expect(normalizeToastDurationSeconds(Number.NaN)).toBe(DEFAULT_TOAST_DURATION_SECONDS);
        expect(normalizeToastDurationSeconds(Infinity)).toBe(DEFAULT_TOAST_DURATION_SECONDS);
        expect(normalizeToastDurationSeconds('10')).toBe(DEFAULT_TOAST_DURATION_SECONDS);
        expect(normalizeToastDurationSeconds(undefined)).toBe(DEFAULT_TOAST_DURATION_SECONDS);
    });
});
