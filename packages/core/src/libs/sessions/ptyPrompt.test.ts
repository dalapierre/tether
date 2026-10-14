import { describe, expect, it } from '@jest/globals';
import { formatShellCommand, quoteShellArg } from './ptyPrompt.js';

describe('quoteShellArg', () => {
    it('leaves simple tokens unquoted', () => {
        expect(quoteShellArg('cursor')).toBe('cursor');
        expect(quoteShellArg('--trust')).toBe('--trust');
    });

    it('quotes and escapes spaces and single quotes', () => {
        expect(quoteShellArg('a b')).toBe("'a b'");
        expect(quoteShellArg("it's")).toBe("'it'\\''s'");
    });
});

describe('formatShellCommand', () => {
    it('joins command and args', () => {
        expect(formatShellCommand('cursor', ['--trust', '--yolo'])).toBe('cursor --trust --yolo');
    });
});
