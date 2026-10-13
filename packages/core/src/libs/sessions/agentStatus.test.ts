import { extractOscTitle, extractStatusFromOutput, statusFromTerminalTitle } from './agentStatus.js';

describe('statusFromTerminalTitle', () => {
    it('reads the leaf after the last " - " separator', () => {
        expect(statusFromTerminalTitle('Cursor Agent - Ready')).toBe('ready');
        expect(statusFromTerminalTitle('repo - feature - Working')).toBe('busy');
    });

    it('prefers ready/waiting over busy keywords', () => {
        expect(statusFromTerminalTitle('Waiting for you')).toBe('ready');
        expect(statusFromTerminalTitle('waiting for confirmation')).toBe('ready');
        expect(statusFromTerminalTitle('Planning next steps')).toBe('busy');
        expect(statusFromTerminalTitle('⠁')).toBe('busy');
    });

    it('returns null for empty or unrecognized titles', () => {
        expect(statusFromTerminalTitle('')).toBeNull();
        expect(statusFromTerminalTitle('   ')).toBeNull();
        expect(statusFromTerminalTitle('Cursor Agent')).toBeNull();
    });
});

describe('extractOscTitle', () => {
    it('extracts the latest complete OSC 0 title from a chunk', () => {
        const state = { pending: '' };
        expect(extractOscTitle('\u001b]0;First\u0007noise\u001b]0;Second\u0007', state)).toBe('Second');
        expect(state.pending).toBe('');
    });

    it('carries incomplete OSC sequences across chunks', () => {
        const state = { pending: '' };
        expect(extractOscTitle('\u001b]0;Work', state)).toBeNull();
        expect(state.pending).toBe('\u001b]0;Work');
        expect(extractOscTitle('ing\u0007', state)).toBe('Working');
        expect(state.pending).toBe('');
    });

    it('ignores blank titles', () => {
        const state = { pending: '' };
        expect(extractOscTitle('\u001b]0;   \u0007', state)).toBeNull();
    });
});

describe('extractStatusFromOutput', () => {
    it('returns the latest recognizable status from OSC titles', () => {
        const state = { pending: '' };
        expect(extractStatusFromOutput('\u001b]0;Working\u0007more\u001b]0;Ready\u0007', state)).toBe('ready');
    });

    it('preserves pending across split status titles', () => {
        const state = { pending: '' };
        expect(extractStatusFromOutput('\u001b]0;Wait', state)).toBeNull();
        expect(extractStatusFromOutput('ing for you\u0007', state)).toBe('ready');
    });
});
