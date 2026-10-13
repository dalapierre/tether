import os from 'node:os';
import path from 'node:path';
import {
    getConversationSessionDir,
    getConversationsDir,
    getHomeDir,
    getRepositoryWorktreesDir,
    getSessionsFilePath,
    getSettingsFilePath,
    getTetherHomeDir,
    getWorktreesDir,
    resolveAbsoluteUserPath,
} from './paths.js';

describe('paths', () => {
    it('anchors tether paths under the user home directory', () => {
        const home = os.homedir();
        expect(getHomeDir()).toBe(home);
        expect(getTetherHomeDir()).toBe(path.join(home, '.tether'));
        expect(getSettingsFilePath()).toBe(path.join(home, '.tether', 'settings.json'));
        expect(getSessionsFilePath()).toBe(path.join(home, '.tether', 'sessions.json'));
        expect(getWorktreesDir()).toBe(path.join(home, '.tether', 'worktrees'));
        expect(getConversationsDir()).toBe(path.join(home, '.tether', 'conversations'));
    });

    it('nests project worktrees and conversation session dirs', () => {
        expect(getRepositoryWorktreesDir('my-app')).toBe(path.join(os.homedir(), '.tether', 'worktrees', 'my-app'));
        expect(getConversationSessionDir('sess-1')).toBe(path.join(os.homedir(), '.tether', 'conversations', 'sess-1'));
    });

    it('uses a custom worktrees root when nesting project dirs', () => {
        expect(getRepositoryWorktreesDir('my-app', '/data/worktrees')).toBe(path.join('/data/worktrees', 'my-app'));
        expect(getRepositoryWorktreesDir('my-app', '  ')).toBe(
            path.join(os.homedir(), '.tether', 'worktrees', 'my-app'),
        );
    });
});

describe('resolveAbsoluteUserPath', () => {
    it('expands ~ and resolves absolute paths', () => {
        const home = os.homedir();
        expect(resolveAbsoluteUserPath('~')).toBe(path.resolve(home));
        expect(resolveAbsoluteUserPath('~/worktrees')).toBe(path.resolve(home, 'worktrees'));
        expect(resolveAbsoluteUserPath('/tmp/worktrees')).toBe(path.resolve('/tmp/worktrees'));
    });

    it('rejects empty, relative, and null-byte paths', () => {
        expect(() => resolveAbsoluteUserPath('')).toThrow('Path is required');
        expect(() => resolveAbsoluteUserPath('  ')).toThrow('Path is required');
        expect(() => resolveAbsoluteUserPath('relative/path')).toThrow('Path must be an absolute path');
        expect(() => resolveAbsoluteUserPath('/tmp/\0bad')).toThrow('Invalid path');
    });
});
