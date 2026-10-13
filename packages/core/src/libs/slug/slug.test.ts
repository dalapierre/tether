import { slugify, uniqueSlug } from './slug.js';

describe('slugify', () => {
    it('converts display names to lowercase kebab-case', () => {
        expect(slugify('My Cool Repo')).toBe('my-cool-repo');
    });

    it('trims edges and collapses non-alphanumeric runs', () => {
        expect(slugify('  Hello---World!!  ')).toBe('hello-world');
        expect(slugify('___')).toBe('');
        expect(slugify('')).toBe('');
    });

    it('preserves digits', () => {
        expect(slugify('Project 42')).toBe('project-42');
    });
});

describe('uniqueSlug', () => {
    it('returns the base when free', () => {
        expect(uniqueSlug('app', new Set())).toBe('app');
        expect(uniqueSlug('app', new Set(['other']))).toBe('app');
    });

    it('appends the next free numeric suffix when taken', () => {
        expect(uniqueSlug('app', new Set(['app']))).toBe('app-2');
        expect(uniqueSlug('app', new Set(['app', 'app-2', 'app-3']))).toBe('app-4');
    });

    it('falls back to "project" for an empty base', () => {
        expect(uniqueSlug('', new Set())).toBe('project');
        expect(uniqueSlug('', new Set(['project']))).toBe('project-2');
    });
});
