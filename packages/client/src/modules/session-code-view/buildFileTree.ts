import type { SessionDiffFile } from '@client/libs/api/sessions';

export type FileTreeFileNode = {
    type: 'file';
    name: string;
    file: SessionDiffFile;
};

export type FileTreeDirNode = {
    type: 'dir';
    /** Display label; may include collapsed path segments like `src/components`. */
    name: string;
    /** Stable path key used for expand/collapse state. */
    path: string;
    children: FileTreeNode[];
};

export type FileTreeNode = FileTreeFileNode | FileTreeDirNode;

type MutableDir = {
    children: Map<string, MutableDir | SessionDiffFile>;
};

function isDir(node: MutableDir | SessionDiffFile): node is MutableDir {
    return 'children' in node;
}

function insertPath(root: MutableDir, file: SessionDiffFile): void {
    const parts = file.path.split('/').filter(Boolean);
    if (parts.length === 0) {
        return;
    }

    let current = root;
    for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i]!;
        const existing = current.children.get(part);
        if (!existing || !isDir(existing)) {
            const dir: MutableDir = { children: new Map() };
            current.children.set(part, dir);
            current = dir;
        } else {
            current = existing;
        }
    }

    const fileName = parts[parts.length - 1]!;
    current.children.set(fileName, file);
}

function toNodes(dir: MutableDir, parentPath: string): FileTreeNode[] {
    const entries = [...dir.children.entries()];
    const nodes: FileTreeNode[] = [];

    for (const [name, child] of entries) {
        const path = parentPath ? `${parentPath}/${name}` : name;

        if (!isDir(child)) {
            nodes.push({ type: 'file', name, file: child });
            continue;
        }

        // Collapse unary directory chains (GitHub-style): src/ → components/ → foo.tsx
        // becomes a single folder node labeled "src/components".
        let collapsedName = name;
        let collapsedPath = path;
        let current = child;

        while (current.children.size === 1) {
            const onlyEntry = current.children.entries().next().value;
            if (!onlyEntry) {
                break;
            }
            const [onlyName, onlyChild] = onlyEntry;
            if (!isDir(onlyChild)) {
                break;
            }
            collapsedName = `${collapsedName}/${onlyName}`;
            collapsedPath = `${collapsedPath}/${onlyName}`;
            current = onlyChild;
        }

        nodes.push({
            type: 'dir',
            name: collapsedName,
            path: collapsedPath,
            children: toNodes(current, collapsedPath),
        });
    }

    // Directories first, then files — closer to GitHub's file tree.
    nodes.sort((a, b) => {
        if (a.type !== b.type) {
            return a.type === 'dir' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
    });

    return nodes;
}

export function buildFileTree(files: SessionDiffFile[]): FileTreeNode[] {
    const root: MutableDir = { children: new Map() };
    for (const file of files) {
        insertPath(root, file);
    }
    return toNodes(root, '');
}
