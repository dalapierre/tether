/** Matches git check-ref-format --branch rules for new branch names. */
export function isValidBranchName(branch: string): boolean {
    if (!branch || branch === 'HEAD' || branch === '@') {
        return false;
    }
    if (branch.startsWith('-') || branch.startsWith('/') || branch.endsWith('/') || branch.endsWith('.')) {
        return false;
    }
    if (branch.includes('..') || branch.includes('//') || branch.includes('@{')) {
        return false;
    }
    // Reject ASCII controls, whitespace, and characters git forbids in refs.
    if (/[\x00-\x1f\x7f\s~^:?*\[\\]/.test(branch)) {
        return false;
    }
    for (const part of branch.split('/')) {
        if (!part || part.startsWith('.') || part.endsWith('.lock')) {
            return false;
        }
    }
    return true;
}
