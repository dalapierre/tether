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
});
