import os from 'node:os';
import path from 'node:path';
import { getWorktreesDir } from '@core/libs/paths.js';
import { normalizeWorktreesDir } from './store.js';

describe('normalizeWorktreesDir', () => {
    it('defaults empty or missing values to ~/.tether/worktrees', () => {
        expect(normalizeWorktreesDir(undefined)).toBe(getWorktreesDir());
        expect(normalizeWorktreesDir(null)).toBe(getWorktreesDir());
        expect(normalizeWorktreesDir('')).toBe(getWorktreesDir());
        expect(normalizeWorktreesDir('   ')).toBe(getWorktreesDir());
    });

    it('accepts absolute paths and expands leading ~', () => {
        expect(normalizeWorktreesDir('/data/worktrees')).toBe('/data/worktrees');
        expect(normalizeWorktreesDir('~/custom-worktrees')).toBe(path.resolve(os.homedir(), 'custom-worktrees'));
    });

    it('falls back to the default for relative or invalid paths', () => {
        expect(normalizeWorktreesDir('relative/path')).toBe(getWorktreesDir());
        expect(normalizeWorktreesDir('/tmp/\0bad')).toBe(getWorktreesDir());
        expect(normalizeWorktreesDir(42)).toBe(getWorktreesDir());
    });
});
