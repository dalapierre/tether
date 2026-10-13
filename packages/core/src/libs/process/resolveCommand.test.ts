import path from 'node:path';
import {
    batchCommandLine,
    escapeBatchArgument,
    findCommandOnPath,
    namesAPath,
    resolvePtyLaunch,
    searchPathDirectories,
} from './resolveCommand.js';

describe('namesAPath', () => {
    it('detects absolute or relative path forms', () => {
        expect(namesAPath('/usr/bin/bash')).toBe(true);
        expect(namesAPath('./bin/tool')).toBe(true);
        expect(namesAPath('C:\\Windows\\System32\\cmd.exe')).toBe(true);
        expect(namesAPath('bash')).toBe(false);
        expect(namesAPath('cursor-agent')).toBe(false);
    });
});

describe('searchPathDirectories', () => {
    it('splits PATH entries and strips surrounding Windows quotes', () => {
        expect(searchPathDirectories('/usr/bin:/opt/bin', ':')).toEqual(['/usr/bin', '/opt/bin']);
        expect(searchPathDirectories('"C:\\Tools";C:\\Windows', ';')).toEqual(['C:\\Tools', 'C:\\Windows']);
        expect(searchPathDirectories(undefined)).toEqual([]);
        expect(searchPathDirectories('::', ':')).toEqual([]);
    });
});

describe('escapeBatchArgument', () => {
    it('always quotes and doubles internal quotes', () => {
        expect(escapeBatchArgument('hello')).toBe('"hello"');
        expect(escapeBatchArgument('say "hi"')).toBe('"say ""hi"""');
    });

    it('doubles a trailing backslash run so the closing quote stays literal', () => {
        expect(escapeBatchArgument('C:\\dir\\')).toBe('"C:\\dir\\\\"');
        expect(escapeBatchArgument('end\\\\')).toBe('"end\\\\\\\\"');
    });

    it('rejects NUL/CR/LF', () => {
        expect(() => escapeBatchArgument('a\0b')).toThrow(/NUL, CR or LF/);
        expect(() => escapeBatchArgument('a\nb')).toThrow(/NUL, CR or LF/);
        expect(() => escapeBatchArgument('a\rb')).toThrow(/NUL, CR or LF/);
    });
});

describe('batchCommandLine', () => {
    it('builds a cmd.exe /d /s /c invocation', () => {
        expect(batchCommandLine('C:\\npm\\claude.cmd', ['--resume', 'abc'])).toBe(
            '/d /s /c ""C:\\npm\\claude.cmd" "--resume" "abc""',
        );
    });
});

describe('findCommandOnPath', () => {
    it('returns null for an empty bin name', async () => {
        await expect(findCommandOnPath('')).resolves.toBeNull();
    });

    it('resolves Unix PATH lookups with a custom exists check', async () => {
        const exists = new Set([path.join('/opt/bin', 'claude')]);
        await expect(
            findCommandOnPath('claude', {
                platform: 'linux',
                searchPath: '/usr/bin:/opt/bin',
                fileExists: (candidate) => exists.has(candidate),
            }),
        ).resolves.toBe(path.join('/opt/bin', 'claude'));
    });

    it('prefers Windows .exe over .cmd across the whole PATH', async () => {
        const exists = new Set([path.win32.join('C:\\Early', 'tool.cmd'), path.win32.join('C:\\Later', 'tool.exe')]);
        await expect(
            findCommandOnPath('tool', {
                platform: 'win32',
                searchPath: 'C:\\Early;C:\\Later',
                fileExists: (candidate) => exists.has(candidate),
            }),
        ).resolves.toBe(path.win32.join('C:\\Later', 'tool.exe'));
    });

    it('falls back to Windows batch shims when no executable exists', async () => {
        const exists = new Set([path.win32.join('C:\\npm', 'agent.cmd')]);
        await expect(
            findCommandOnPath('agent', {
                platform: 'win32',
                searchPath: 'C:\\npm',
                fileExists: (candidate) => exists.has(candidate),
            }),
        ).resolves.toBe(path.win32.join('C:\\npm', 'agent.cmd'));
    });

    it('checks an explicit path as-is on Windows', async () => {
        await expect(
            findCommandOnPath('C:\\Tools\\bin.exe', {
                platform: 'win32',
                fileExists: (candidate) => candidate === 'C:\\Tools\\bin.exe',
            }),
        ).resolves.toBe('C:\\Tools\\bin.exe');
        await expect(
            findCommandOnPath('C:\\missing.exe', {
                platform: 'win32',
                fileExists: () => false,
            }),
        ).resolves.toBeNull();
    });
});

describe('resolvePtyLaunch', () => {
    it('returns the resolved Unix path when found', async () => {
        const bin = path.join('/usr/local/bin', 'claude');
        await expect(
            resolvePtyLaunch('claude', ['--resume', 'id'], {
                platform: 'linux',
                searchPath: '/usr/local/bin',
                fileExists: (candidate) => candidate === bin,
            }),
        ).resolves.toEqual({ file: bin, args: ['--resume', 'id'] });
    });

    it('wraps Windows .cmd shims through cmd.exe', async () => {
        const cmdPath = path.win32.join('C:\\npm', 'agent.cmd');
        const comspec = 'C:\\Windows\\System32\\cmd.exe';
        await expect(
            resolvePtyLaunch('agent', ['--trust'], {
                platform: 'win32',
                searchPath: 'C:\\npm',
                comspec,
                fileExists: (candidate) => candidate === cmdPath || candidate === comspec,
            }),
        ).resolves.toEqual({
            file: comspec,
            args: batchCommandLine(cmdPath, ['--trust']),
        });
    });

    it('spawns Windows .exe paths directly', async () => {
        const exe = path.win32.join('C:\\Program Files\\tool', 'tool.exe');
        await expect(
            resolvePtyLaunch('tool', ['a'], {
                platform: 'win32',
                searchPath: 'C:\\Program Files\\tool',
                fileExists: (candidate) => candidate === exe,
            }),
        ).resolves.toEqual({ file: exe, args: ['a'] });
    });

    it('falls back to the bare name when nothing is on PATH', async () => {
        await expect(
            resolvePtyLaunch('missing-bin', ['x'], {
                platform: 'linux',
                searchPath: '/empty',
                fileExists: () => false,
            }),
        ).resolves.toEqual({ file: 'missing-bin', args: ['x'] });
    });
});
