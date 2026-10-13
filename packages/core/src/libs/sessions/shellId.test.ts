import { isValidShellId, MAX_SESSION_SHELLS } from './store.js';

describe('isValidShellId', () => {
    it('accepts short alphanumeric ids with _ and -', () => {
        expect(isValidShellId('a')).toBe(true);
        expect(isValidShellId('shell-1')).toBe(true);
        expect(isValidShellId('Shell_02')).toBe(true);
        expect(isValidShellId('x'.repeat(64))).toBe(true);
    });

    it('rejects empty, oversized, or punctuation-heavy ids', () => {
        expect(isValidShellId('')).toBe(false);
        expect(isValidShellId('x'.repeat(65))).toBe(false);
        expect(isValidShellId('shell 1')).toBe(false);
        expect(isValidShellId('shell/1')).toBe(false);
        expect(isValidShellId('../x')).toBe(false);
    });
});

describe('MAX_SESSION_SHELLS', () => {
    it('caps concurrent shells per session', () => {
        expect(MAX_SESSION_SHELLS).toBe(4);
    });
});
