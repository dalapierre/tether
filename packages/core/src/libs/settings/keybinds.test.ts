import { DEFAULT_KEYBINDS, isKeybinds, normalizeKeybinds } from './keybinds.js';

describe('normalizeKeybinds', () => {
    it('returns defaults for nullish or non-object input', () => {
        expect(normalizeKeybinds(undefined)).toEqual(DEFAULT_KEYBINDS);
        expect(normalizeKeybinds(null)).toEqual(DEFAULT_KEYBINDS);
        expect(normalizeKeybinds('nope')).toEqual(DEFAULT_KEYBINDS);
    });

    it('merges partial overrides and lowercases chords', () => {
        const next = normalizeKeybinds({
            home: { newSession: ' N ' },
            session: { toggleReview: 'Ctrl+.' },
        });
        expect(next.home.newSession).toBe('n');
        expect(next.session.toggleReview).toBe('alt+.');
        expect(next.home.openSettings).toBe(DEFAULT_KEYBINDS.home.openSettings);
    });

    it('rewrites mod/ctrl/option aliases to alt without duplicating', () => {
        expect(normalizeKeybinds({ session: { toggleTerminal: 'mod+q' } }).session.toggleTerminal).toBe('alt+q');
        expect(normalizeKeybinds({ session: { toggleTerminal: 'option+alt+q' } }).session.toggleTerminal).toBe('alt+q');
        expect(normalizeKeybinds({ session: { reviewFullscreen: 'super+.' } }).session.reviewFullscreen).toBe(
            'super+.',
        );
    });

    it('migrates legacy codeReview chords into session when missing', () => {
        const next = normalizeKeybinds({
            codeReview: { nextFile: 'j', previousFile: 'k', toggleMarkdownPreview: 'v' },
            session: { nextFile: 'x' },
        });
        expect(next.session.nextFile).toBe('x');
        expect(next.session.previousFile).toBe('k');
        expect(next.session.toggleMarkdownPreview).toBe('v');
    });

    it('migrates renamed agent-insert chords and old defaults', () => {
        expect(normalizeKeybinds({ session: { focusAgent: 'a' } }).session.enterAgentInsert).toBe('a');
        expect(normalizeKeybinds({ session: { toggleAgentInsert: 'i' } }).session.enterAgentInsert).toBe('i');
        expect(normalizeKeybinds({ session: { enterAgentInsert: 'super+1' } }).session.enterAgentInsert).toBe('i');
        expect(normalizeKeybinds({ session: { goBack: 'q' } }).session.goBack).toBe('');
        expect(normalizeKeybinds({ session: { goBack: 'escape' } }).session.goBack).toBe('');
    });

    it('ignores non-string chord values', () => {
        const next = normalizeKeybinds({ home: { newSession: 12 } });
        expect(next.home.newSession).toBe(DEFAULT_KEYBINDS.home.newSession);
    });
});

describe('isKeybinds', () => {
    it('requires home and session object categories', () => {
        expect(isKeybinds(DEFAULT_KEYBINDS)).toBe(true);
        expect(isKeybinds({ home: {}, session: {} })).toBe(true);
        expect(isKeybinds({ home: {} })).toBe(false);
        expect(isKeybinds(null)).toBe(false);
        expect(isKeybinds('x')).toBe(false);
    });
});
