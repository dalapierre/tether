import { assertSafeRelativePath, DiffAbortError, isDiffAbortError } from './diff.js';

describe('assertSafeRelativePath', () => {
    it('normalizes relative paths and strips a leading ./', () => {
        expect(assertSafeRelativePath('src/index.ts')).toBe('src/index.ts');
        expect(assertSafeRelativePath('./src/index.ts')).toBe('src/index.ts');
        expect(assertSafeRelativePath('src\\file.ts')).toBe('src/file.ts');
    });

    it('rejects absolute, empty, NUL, and traversal paths', () => {
        expect(() => assertSafeRelativePath('')).toThrow('Invalid path');
        expect(() => assertSafeRelativePath('/etc/passwd')).toThrow('Invalid path');
        expect(() => assertSafeRelativePath('a\0b')).toThrow('Invalid path');
        expect(() => assertSafeRelativePath('../secret')).toThrow('Invalid path');
        expect(() => assertSafeRelativePath('foo/../bar')).toThrow('Invalid path');
    });
});

describe('isDiffAbortError', () => {
    it('recognizes DiffAbortError and AbortError by name', () => {
        expect(isDiffAbortError(new DiffAbortError())).toBe(true);
        const abort = new Error('aborted');
        abort.name = 'AbortError';
        expect(isDiffAbortError(abort)).toBe(true);
        expect(isDiffAbortError(new Error('other'))).toBe(false);
        expect(isDiffAbortError('nope')).toBe(false);
    });
});
