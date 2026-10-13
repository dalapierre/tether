import { getHarnessCommand } from './harness.js';

describe('getHarnessCommand', () => {
    it('builds Cursor argv with trust, resume, and optional yolo', () => {
        expect(getHarnessCommand('cursor')).toEqual({ command: 'agent', args: ['--trust'] });
        expect(getHarnessCommand('cursor', { agentSessionId: 'chat-1', yoloMode: true })).toEqual({
            command: 'agent',
            args: ['--trust', '--resume=chat-1', '--yolo'],
        });
    });

    it('uses Claude session-id for new chats and --resume only when resuming', () => {
        expect(getHarnessCommand('claude', { agentSessionId: 'uuid' })).toEqual({
            command: 'claude',
            args: ['--session-id', 'uuid'],
        });
        expect(getHarnessCommand('claude', { agentSessionId: 'uuid', resume: true, yoloMode: true })).toEqual({
            command: 'claude',
            args: ['--resume', 'uuid', '--dangerously-skip-permissions'],
        });
    });

    it('builds Codex resume vs fresh launches', () => {
        expect(getHarnessCommand('codex', { yoloMode: true })).toEqual({
            command: 'codex',
            args: ['--ask-for-approval', 'never'],
        });
        expect(getHarnessCommand('codex', { agentSessionId: 's1', resume: true })).toEqual({
            command: 'codex',
            args: ['resume', 's1'],
        });
    });

    it('builds OpenCode and Rovo flags, including acli legacy form', () => {
        expect(getHarnessCommand('opencode', { agentSessionId: 's1', resume: true, yoloMode: true })).toEqual({
            command: 'opencode',
            args: ['--session', 's1', '--auto'],
        });
        expect(getHarnessCommand('rovo', { agentSessionId: 's1', resume: true, yoloMode: true })).toEqual({
            command: 'rovo',
            args: ['--restore', 's1', '--yolo'],
        });
        expect(getHarnessCommand('rovo', { yoloMode: true }, 'acli')).toEqual({
            command: 'acli',
            args: ['rovodev', 'run', '--yolo'],
        });
    });

    it('ignores blank session ids and resume without an id', () => {
        expect(getHarnessCommand('claude', { agentSessionId: '  ', resume: true })).toEqual({
            command: 'claude',
            args: [],
        });
        expect(getHarnessCommand('opencode', { resume: true })).toEqual({
            command: 'opencode',
            args: [],
        });
    });
});
