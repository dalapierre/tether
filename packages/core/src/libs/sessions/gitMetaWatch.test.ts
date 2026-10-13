import { isGitMetaWatchPath } from './gitMetaWatch.js';

describe('isGitMetaWatchPath', () => {
    it('treats missing names as interesting', () => {
        expect(isGitMetaWatchPath(null)).toBe(true);
        expect(isGitMetaWatchPath(undefined)).toBe(true);
        expect(isGitMetaWatchPath('')).toBe(true);
    });

    it('matches HEAD, index, packed-refs and their lock files', () => {
        expect(isGitMetaWatchPath('HEAD')).toBe(true);
        expect(isGitMetaWatchPath('HEAD.lock')).toBe(true);
        expect(isGitMetaWatchPath('index')).toBe(true);
        expect(isGitMetaWatchPath('index.lock')).toBe(true);
        expect(isGitMetaWatchPath('packed-refs')).toBe(true);
        expect(isGitMetaWatchPath('packed-refs.lock')).toBe(true);
    });

    it('matches refs and logs tip paths from recursive or direct-child watches', () => {
        expect(isGitMetaWatchPath('refs')).toBe(true);
        expect(isGitMetaWatchPath('refs/heads/main')).toBe(true);
        expect(isGitMetaWatchPath('refs/heads/main.lock')).toBe(true);
        expect(isGitMetaWatchPath('logs')).toBe(true);
        expect(isGitMetaWatchPath('logs/HEAD')).toBe(true);
        expect(isGitMetaWatchPath('logs/refs/heads/main')).toBe(true);
    });

    it('ignores unrelated gitdir noise', () => {
        expect(isGitMetaWatchPath('COMMIT_EDITMSG')).toBe(false);
        expect(isGitMetaWatchPath('objects')).toBe(false);
        expect(isGitMetaWatchPath('objects/ab/cd')).toBe(false);
        expect(isGitMetaWatchPath('config')).toBe(false);
        expect(isGitMetaWatchPath('AUTO_MERGE')).toBe(false);
    });
});
