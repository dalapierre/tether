import { describe, expect, it } from '@jest/globals';
import { formatExplainErrorPrompt } from './explainErrorPrompt';

describe('formatExplainErrorPrompt', () => {
    it('formats the explain prompt with error text and command', () => {
        expect(formatExplainErrorPrompt('ENOENT: no such file', 'npm test')).toBe(
            ['[Explain this error]', 'errorMessage: ENOENT: no such file', 'command: npm test'].join('\n'),
        );
    });

    it('keeps an empty command when unknown', () => {
        expect(formatExplainErrorPrompt('boom', '')).toBe(
            ['[Explain this error]', 'errorMessage: boom', 'command: '].join('\n'),
        );
    });
});
