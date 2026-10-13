import {
    BRANCH_IN_USE_BY_WORKTREE_ERROR,
    isBranchClaimedBySession,
    isBranchListedInWorktreePorcelain,
    type SessionBranchClaim,
} from './worktreeBranch.js';

const SAMPLE_PORCELAIN = [
    'worktree /repo',
    'HEAD abc123',
    'branch refs/heads/main',
    '',
    'worktree /repo/.tether/feature-a',
    'HEAD def456',
    'branch refs/heads/feature/a',
    '',
    'worktree /repo/.tether/detached',
    'HEAD fedcba',
    'detached',
    '',
].join('\n');

describe('isBranchListedInWorktreePorcelain', () => {
    it('detects the main checkout and linked worktree branches', () => {
        expect(isBranchListedInWorktreePorcelain(SAMPLE_PORCELAIN, 'main')).toBe(true);
        expect(isBranchListedInWorktreePorcelain(SAMPLE_PORCELAIN, 'feature/a')).toBe(true);
    });

    it('ignores detached HEAD and unknown branches', () => {
        expect(isBranchListedInWorktreePorcelain(SAMPLE_PORCELAIN, 'missing')).toBe(false);
        expect(isBranchListedInWorktreePorcelain(SAMPLE_PORCELAIN, 'feature')).toBe(false);
        expect(isBranchListedInWorktreePorcelain('', 'main')).toBe(false);
    });

    it('requires an exact refs/heads match', () => {
        expect(isBranchListedInWorktreePorcelain('branch refs/heads/main\n', 'main')).toBe(true);
        expect(isBranchListedInWorktreePorcelain('branch refs/remotes/origin/main\n', 'main')).toBe(false);
        expect(isBranchListedInWorktreePorcelain('branch refs/heads/main-extra\n', 'main')).toBe(false);
    });
});

describe('isBranchClaimedBySession', () => {
    const sessions: SessionBranchClaim[] = [
        { repositoryId: 'app', useWorktrees: true, branch: 'feature/a' },
        { repositoryId: 'app', useWorktrees: false, branch: 'main' },
        { repositoryId: 'other', useWorktrees: true, branch: 'feature/a' },
        { repositoryId: 'app', useWorktrees: true, branch: null },
    ];

    it('detects a worktree session on the same repo and branch', () => {
        expect(isBranchClaimedBySession(sessions, 'app', 'feature/a')).toBe(true);
    });

    it('ignores non-worktree sessions, other repos, and null branches', () => {
        expect(isBranchClaimedBySession(sessions, 'app', 'main')).toBe(false);
        expect(isBranchClaimedBySession(sessions, 'app', 'missing')).toBe(false);
        expect(isBranchClaimedBySession([], 'app', 'feature/a')).toBe(false);
    });
});

describe('BRANCH_IN_USE_BY_WORKTREE_ERROR', () => {
    it('is the stable createSession rejection message', () => {
        expect(BRANCH_IN_USE_BY_WORKTREE_ERROR).toBe('Branch is already checked out in another worktree');
    });
});
