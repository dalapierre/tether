/** Stable error when createSession rejects a branch already claimed by a worktree. */
export const BRANCH_IN_USE_BY_WORKTREE_ERROR = 'Branch is already checked out in another worktree';

export type SessionBranchClaim = {
    repositoryId: string;
    useWorktrees: boolean;
    branch: string | null;
};

/**
 * True when `git worktree list --porcelain` shows `branch` checked out
 * (main repo or linked worktree).
 */
export function isBranchListedInWorktreePorcelain(porcelain: string, branch: string): boolean {
    const expected = `refs/heads/${branch}`;
    for (const line of porcelain.split('\n')) {
        if (!line.startsWith('branch ')) continue;
        if (line.slice('branch '.length).trim() === expected) {
            return true;
        }
    }
    return false;
}

/** True when a live worktree session already claims this branch for the repository. */
export function isBranchClaimedBySession(
    sessions: Iterable<SessionBranchClaim>,
    repositoryId: string,
    branch: string,
): boolean {
    for (const session of sessions) {
        if (session.repositoryId === repositoryId && session.useWorktrees && session.branch === branch) {
            return true;
        }
    }
    return false;
}
