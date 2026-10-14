import { getHarnessCommand } from './harness.js';

describe('getHarnessCommand', () => {
    it('builds Cursor argv with trust, resume, and optional yolo', () => {
        expect(getHarnessCommand('cursor')).toEqual({ command: 'agent', args: ['--trust'] });
        expect(getHarnessCommand('cursor', { agentSessionId: 'chat-1', yoloMode: true })).toEqual({
            command: 'agent',
            args: ['--trust', '--resume=chat-1', '--yolo'],
        });
    });

    it('passes Cursor initial prompt, ask mode, and yolo on the CLI', () => {
        expect(
            getHarnessCommand('cursor', {
                initialPrompt: 'Explain this error',
                askMode: true,
                yoloMode: true,
            }),
        ).toEqual({
            command: 'agent',
            args: ['--trust', '--mode=ask', '--yolo', 'Explain this error'],
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

    it('passes Claude initial prompt with plan permission mode and yolo for ask', () => {
        expect(
            getHarnessCommand('claude', {
                agentSessionId: 'uuid',
                initialPrompt: 'What broke?',
                askMode: true,
                yoloMode: true,
            }),
        ).toEqual({
            command: 'claude',
            args: [
                '--session-id',
                'uuid',
                '--permission-mode',
                'plan',
                '--dangerously-skip-permissions',
                'What broke?',
            ],
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

    it('passes Codex initial prompt with read-only sandbox and yolo approval for ask', () => {
        expect(
            getHarnessCommand('codex', {
                initialPrompt: 'Why did npm fail?',
                askMode: true,
                yoloMode: true,
            }),
        ).toEqual({
            command: 'codex',
            args: ['--sandbox', 'read-only', '--ask-for-approval', 'never', 'Why did npm fail?'],
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

    it('passes OpenCode --prompt and plan agent for ask', () => {
        expect(
            getHarnessCommand('opencode', {
                initialPrompt: 'Explain the stack',
                askMode: true,
            }),
        ).toEqual({
            command: 'opencode',
            args: ['--agent', 'plan', '--prompt', 'Explain the stack'],
        });
    });

    it('passes Rovo trailing instruction for an initial prompt', () => {
        expect(getHarnessCommand('rovo', { initialPrompt: 'What is this error?', askMode: true }, 'acli')).toEqual({
            command: 'acli',
            args: ['rovodev', 'run', 'What is this error?'],
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
