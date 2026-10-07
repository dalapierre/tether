import { execFile } from 'node:child_process';
import { readFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export type DiffFileStatus = 'added' | 'modified' | 'deleted' | 'renamed';

export type SessionDiffFile = {
    path: string;
    oldPath?: string;
    status: DiffFileStatus;
    additions: number | null;
    deletions: number | null;
    binary: boolean;
};

export type SessionDiffSummary = {
    baseSha: string;
    files: SessionDiffFile[];
};

export type SessionFileDiff = {
    path: string;
    oldPath?: string;
    status: DiffFileStatus;
    language: string;
    original: string;
    modified: string;
    binary: boolean;
};

function gitEnv(): NodeJS.ProcessEnv {
    return {
        ...process.env,
        GIT_TERMINAL_PROMPT: '0',
        LANG: 'C',
    };
}

async function git(cwd: string, args: string[]): Promise<string> {
    const { stdout } = await execFileAsync('git', args, {
        cwd,
        env: gitEnv(),
        maxBuffer: 20 * 1024 * 1024,
    });
    return stdout;
}

function assertSafeRelativePath(filePath: string): string {
    const normalized = filePath.replaceAll('\\', '/').replace(/^\.\//, '');
    if (!normalized || normalized.startsWith('/') || normalized.includes('\0')) {
        throw new Error('Invalid path');
    }
    const parts = normalized.split('/');
    if (parts.some((part) => part === '..')) {
        throw new Error('Invalid path');
    }
    return normalized;
}

function resolveInWorktree(worktreePath: string, filePath: string): string {
    const safe = assertSafeRelativePath(filePath);
    const resolved = path.resolve(worktreePath, safe);
    const root = path.resolve(worktreePath);
    if (resolved !== root && !resolved.startsWith(root + path.sep)) {
        throw new Error('Invalid path');
    }
    return resolved;
}

function parseStatus(code: string): DiffFileStatus | null {
    switch (code[0]) {
        case 'A':
            return 'added';
        case 'M':
            return 'modified';
        case 'D':
            return 'deleted';
        case 'R':
            return 'renamed';
        case 'C':
            return 'added';
        case 'T':
            return 'modified';
        default:
            return null;
    }
}

function languageFromPath(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const map: Record<string, string> = {
        '.ts': 'typescript',
        '.tsx': 'typescript',
        '.js': 'javascript',
        '.jsx': 'javascript',
        '.mjs': 'javascript',
        '.cjs': 'javascript',
        '.json': 'json',
        '.css': 'css',
        '.scss': 'scss',
        '.less': 'less',
        '.html': 'html',
        '.htm': 'html',
        '.md': 'markdown',
        '.markdown': 'markdown',
        '.py': 'python',
        '.rs': 'rust',
        '.go': 'go',
        '.java': 'java',
        '.kt': 'kotlin',
        '.swift': 'swift',
        '.rb': 'ruby',
        '.php': 'php',
        '.c': 'c',
        '.h': 'c',
        '.cpp': 'cpp',
        '.cc': 'cpp',
        '.cxx': 'cpp',
        '.hpp': 'cpp',
        '.cs': 'csharp',
        '.sh': 'shell',
        '.bash': 'shell',
        '.zsh': 'shell',
        '.yml': 'yaml',
        '.yaml': 'yaml',
        '.toml': 'ini',
        '.ini': 'ini',
        '.xml': 'xml',
        '.sql': 'sql',
        '.graphql': 'graphql',
        '.gql': 'graphql',
        '.vue': 'html',
        '.svelte': 'html',
        '.txt': 'plaintext',
    };
    return map[ext] ?? 'plaintext';
}

async function readBaseFile(worktreePath: string, baseSha: string, filePath: string): Promise<string | null> {
    try {
        return await git(worktreePath, ['show', `${baseSha}:${filePath}`]);
    } catch {
        return null;
    }
}

async function readWorkingFile(worktreePath: string, filePath: string): Promise<string | null> {
    try {
        return await readFile(resolveInWorktree(worktreePath, filePath), 'utf8');
    } catch {
        return null;
    }
}

function looksBinary(content: string): boolean {
    return content.includes('\0');
}

export async function getSessionDiffSummary(worktreePath: string, baseSha: string): Promise<SessionDiffSummary> {
    const nameStatus = await git(worktreePath, ['-c', 'core.quotepath=false', 'diff', '--name-status', '-M', baseSha]);
    const numstat = await git(worktreePath, ['-c', 'core.quotepath=false', 'diff', '--numstat', '-M', baseSha]);
    const untracked = await git(worktreePath, [
        '-c',
        'core.quotepath=false',
        'ls-files',
        '--others',
        '--exclude-standard',
    ]);

    const stats = new Map<string, { additions: number | null; deletions: number | null; binary: boolean }>();
    for (const line of numstat.split('\n')) {
        if (!line.trim()) continue;
        const parts = line.split('\t');
        if (parts.length < 3) continue;
        const [addRaw, delRaw, ...pathParts] = parts;
        const filePath = pathParts.join('\t');
        // Renames appear as "old => new" in numstat when -M is used with certain formats;
        // with plain --numstat -M, git still prints the new path only in modern git for renames in some versions.
        // Handle "old => new" just in case.
        const arrow = ' => ';
        const key = filePath.includes(arrow) ? filePath.slice(filePath.lastIndexOf(arrow) + arrow.length) : filePath;
        const binary = addRaw === '-' && delRaw === '-';
        stats.set(key, {
            additions: binary ? null : Number.parseInt(addRaw, 10) || 0,
            deletions: binary ? null : Number.parseInt(delRaw, 10) || 0,
            binary,
        });
    }

    const files: SessionDiffFile[] = [];
    const seen = new Set<string>();

    for (const line of nameStatus.split('\n')) {
        if (!line.trim()) continue;
        const parts = line.split('\t');
        const code = parts[0] ?? '';
        const status = parseStatus(code);
        if (!status) continue;

        let filePath: string;
        let oldPath: string | undefined;
        if (status === 'renamed' && parts.length >= 3) {
            oldPath = parts[1];
            filePath = parts[2]!;
        } else {
            filePath = parts[1]!;
        }
        if (!filePath) continue;

        const stat = stats.get(filePath) ?? { additions: 0, deletions: 0, binary: false };
        files.push({
            path: filePath,
            oldPath,
            status,
            additions: stat.additions,
            deletions: stat.deletions,
            binary: stat.binary,
        });
        seen.add(filePath);
    }

    for (const line of untracked.split('\n')) {
        const filePath = line.trim();
        if (!filePath || seen.has(filePath)) continue;
        let additions: number | null = 0;
        let binary = false;
        try {
            const content = await readWorkingFile(worktreePath, filePath);
            if (content === null) continue;
            if (looksBinary(content)) {
                binary = true;
                additions = null;
            } else {
                additions = content.length === 0 ? 0 : content.split('\n').length;
            }
        } catch {
            // skip unreadable
        }
        files.push({
            path: filePath,
            status: 'added',
            additions,
            deletions: binary ? null : 0,
            binary,
        });
    }

    files.sort((a, b) => a.path.localeCompare(b.path));
    return { baseSha, files };
}

export async function getSessionFileDiff(
    worktreePath: string,
    baseSha: string,
    filePath: string,
): Promise<SessionFileDiff> {
    const safePath = assertSafeRelativePath(filePath);
    const summary = await getSessionDiffSummary(worktreePath, baseSha);
    const meta = summary.files.find((file) => file.path === safePath);
    if (!meta) {
        throw new Error('File not found in diff');
    }

    if (meta.binary) {
        return {
            path: meta.path,
            oldPath: meta.oldPath,
            status: meta.status,
            language: languageFromPath(meta.path),
            original: '',
            modified: '',
            binary: true,
        };
    }

    const originalPath = meta.oldPath ?? meta.path;
    let original = '';
    let modified = '';

    if (meta.status !== 'added') {
        original = (await readBaseFile(worktreePath, baseSha, originalPath)) ?? '';
        if (looksBinary(original)) {
            return {
                path: meta.path,
                oldPath: meta.oldPath,
                status: meta.status,
                language: languageFromPath(meta.path),
                original: '',
                modified: '',
                binary: true,
            };
        }
    }

    if (meta.status !== 'deleted') {
        modified = (await readWorkingFile(worktreePath, meta.path)) ?? '';
        if (looksBinary(modified)) {
            return {
                path: meta.path,
                oldPath: meta.oldPath,
                status: meta.status,
                language: languageFromPath(meta.path),
                original: '',
                modified: '',
                binary: true,
            };
        }
    }

    return {
        path: meta.path,
        oldPath: meta.oldPath,
        status: meta.status,
        language: languageFromPath(meta.path),
        original,
        modified,
        binary: false,
    };
}

async function removeWorktreePath(worktreePath: string, filePath: string): Promise<void> {
    const abs = resolveInWorktree(worktreePath, filePath);
    await unlink(abs).catch(() => undefined);
    try {
        await git(worktreePath, ['rm', '-f', '--ignore-unmatch', '--', filePath]);
    } catch {
        // Untracked-only paths are already gone after unlink.
    }
}

async function restoreFromBase(worktreePath: string, baseSha: string, filePath: string): Promise<void> {
    await git(worktreePath, ['checkout', baseSha, '--', filePath]);
}

/** Restore a single review-diff path to the session base (VS Code–style discard). */
export async function discardSessionDiffFile(worktreePath: string, baseSha: string, filePath: string): Promise<void> {
    const safePath = assertSafeRelativePath(filePath);
    const summary = await getSessionDiffSummary(worktreePath, baseSha);
    const meta = summary.files.find((file) => file.path === safePath);
    if (!meta) {
        throw new Error('File not found in diff');
    }

    switch (meta.status) {
        case 'added':
            await removeWorktreePath(worktreePath, meta.path);
            return;
        case 'deleted':
        case 'modified':
            await restoreFromBase(worktreePath, baseSha, meta.path);
            return;
        case 'renamed': {
            await removeWorktreePath(worktreePath, meta.path);
            if (meta.oldPath) {
                await restoreFromBase(worktreePath, baseSha, assertSafeRelativePath(meta.oldPath));
            }
            return;
        }
    }
}
