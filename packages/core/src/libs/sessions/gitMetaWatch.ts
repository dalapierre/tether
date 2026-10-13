/**
 * Gitdir paths that signal checkout / index / tip movement.
 * Same-branch commits do not change HEAD text; the tip lands in refs/ or packed-refs,
 * often after index is rewritten. Lock files bookend those writes on non-recursive watches.
 */
export function isGitMetaWatchPath(filename: string | Buffer | null | undefined): boolean {
    // Some platforms omit the name; treat as interesting rather than drop the event.
    if (filename == null || filename === '') return true;
    const normalized = String(filename).replace(/\\/g, '/');
    const unlocked = normalized.endsWith('.lock') ? normalized.slice(0, -5) : normalized;
    if (
        unlocked === 'HEAD' ||
        unlocked === 'index' ||
        unlocked === 'packed-refs' ||
        // `git pull` / `git fetch <refspec>` write FETCH_HEAD at the gitdir root.
        unlocked === 'FETCH_HEAD'
    ) {
        return true;
    }
    // Non-recursive watches may only report the direct child ("refs", "logs").
    if (unlocked === 'refs' || unlocked === 'logs') {
        return true;
    }
    return unlocked.startsWith('refs/') || unlocked === 'logs/HEAD' || unlocked.startsWith('logs/refs/');
}

/**
 * Subdirectories of a gitdir that hold nested tip updates. Non-recursive watches on the
 * gitdir root never see `refs/heads/*` or `refs/remotes/origin/*` writes, so these are
 * watched recursively on their own (avoiding the large `objects/` tree).
 */
export const GIT_REF_WATCH_SUBDIRS = ['refs', 'logs'] as const;
