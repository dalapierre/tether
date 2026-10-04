/** Lowercase kebab-case slug from a display name (e.g. "My cool repo" → "my-cool-repo"). */
export function slugify(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

/** Return `base` or `base-2`, `base-3`, … until the slug is not in `taken`. */
export function uniqueSlug(base: string, taken: ReadonlySet<string>): string {
    const root = base || 'project';
    if (!taken.has(root)) {
        return root;
    }

    let n = 2;
    while (taken.has(`${root}-${n}`)) {
        n += 1;
    }
    return `${root}-${n}`;
}
