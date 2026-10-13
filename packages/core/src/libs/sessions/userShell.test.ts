import { resolveUserShell } from './userShell.js';

describe('resolveUserShell', () => {
    const originalShell = process.env.SHELL;
    const originalComspec = process.env.ComSpec;

    afterEach(() => {
        if (originalShell === undefined) delete process.env.SHELL;
        else process.env.SHELL = originalShell;
        if (originalComspec === undefined) delete process.env.ComSpec;
        else process.env.ComSpec = originalComspec;
    });

    it('uses SHELL on Unix and falls back to /bin/bash', () => {
        process.env.SHELL = '/bin/zsh';
        expect(resolveUserShell('linux')).toEqual({ file: '/bin/zsh', args: [] });

        process.env.SHELL = '   ';
        expect(resolveUserShell('darwin')).toEqual({ file: '/bin/bash', args: [] });
    });

    it('uses ComSpec on Windows and falls back to cmd.exe', () => {
        process.env.ComSpec = 'C:\\Windows\\System32\\cmd.exe';
        expect(resolveUserShell('win32')).toEqual({ file: 'C:\\Windows\\System32\\cmd.exe', args: [] });

        delete process.env.ComSpec;
        expect(resolveUserShell('win32')).toEqual({ file: 'cmd.exe', args: [] });
    });
});
