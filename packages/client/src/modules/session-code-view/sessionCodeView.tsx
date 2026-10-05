import {
    getSessionDiff,
    getSessionDiffFile,
    type DiffFileStatus,
    type SessionDiffFile,
    type SessionFileDiff,
} from '@client/libs/api/sessions';
import { setupMonaco } from '@client/libs/monaco/setup';
import { showToast } from '@client/modules/toast';
import { DiffEditor } from '@monaco-editor/react';
import { useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { buildFileTree, type FileTreeDirNode, type FileTreeNode } from './buildFileTree';
import { messages } from './sessionCodeView.messages';
import { styles } from './sessionCodeView.styles';
import type { SessionCodeViewProps } from './sessionCodeView.types';

setupMonaco();

const TREE_INDENT_PX = 12;
const TREE_BASE_PAD_PX = 12;

function statusClass(status: DiffFileStatus): string {
    switch (status) {
        case 'added':
            return styles.statusAdded;
        case 'modified':
            return styles.statusModified;
        case 'deleted':
            return styles.statusDeleted;
        case 'renamed':
            return styles.statusRenamed;
    }
}

function statusLabel(status: DiffFileStatus, formatMessage: ReturnType<typeof useIntl>['formatMessage']): string {
    switch (status) {
        case 'added':
            return formatMessage(messages.statusAdded);
        case 'modified':
            return formatMessage(messages.statusModified);
        case 'deleted':
            return formatMessage(messages.statusDeleted);
        case 'renamed':
            return formatMessage(messages.statusRenamed);
    }
}

function BackIcon() {
    return (
        <svg className={styles.backIcon} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.75'>
            <path strokeLinecap='round' strokeLinejoin='round' d='M15.75 19.5 8.25 12l7.5-7.5' />
        </svg>
    );
}

function ChevronIcon({ collapsed }: { collapsed: boolean }) {
    return (
        <svg
            className={collapsed ? styles.chevronCollapsed : styles.chevron}
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            aria-hidden='true'
        >
            <path strokeLinecap='round' strokeLinejoin='round' d='m19.5 8.25-7.5 7.5-7.5-7.5' />
        </svg>
    );
}

function FolderIcon() {
    return (
        <svg className={styles.folderIcon} viewBox='0 0 24 24' fill='currentColor' aria-hidden='true'>
            <path d='M10.5 4.5a1.5 1.5 0 0 1 1.06.44l1.5 1.5c.28.28.66.44 1.06.44H19.5A2.25 2.25 0 0 1 21.75 9v8.25A2.25 2.25 0 0 1 19.5 19.5h-15A2.25 2.25 0 0 1 2.25 17.25V6.75A2.25 2.25 0 0 1 4.5 4.5h6Z' />
        </svg>
    );
}

function DirRow({
    node,
    depth,
    collapsed,
    onToggle,
}: {
    node: FileTreeDirNode;
    depth: number;
    collapsed: boolean;
    onToggle: (path: string) => void;
}) {
    const intl = useIntl();

    return (
        <button
            type='button'
            className={`${styles.treeRow} ${styles.dirButton}`}
            style={{ paddingLeft: TREE_BASE_PAD_PX + depth * TREE_INDENT_PX }}
            onClick={() => onToggle(node.path)}
            aria-expanded={!collapsed}
            aria-label={intl.formatMessage(collapsed ? messages.expandFolder : messages.collapseFolder, {
                name: node.name,
            })}
        >
            <ChevronIcon collapsed={collapsed} />
            <FolderIcon />
            <span className={`${styles.nodeLabel} ${styles.dirLabel}`}>{node.name}</span>
        </button>
    );
}

function FileRow({
    file,
    name,
    depth,
    onSelect,
}: {
    file: SessionDiffFile;
    name: string;
    depth: number;
    onSelect: (path: string) => void;
}) {
    const intl = useIntl();

    return (
        <button
            type='button'
            className={`${styles.treeRow} ${styles.fileButton}`}
            style={{ paddingLeft: TREE_BASE_PAD_PX + depth * TREE_INDENT_PX }}
            onClick={() => onSelect(file.path)}
        >
            <span className={styles.chevronSpacer} />
            <span className={`${styles.statusBadge} ${statusClass(file.status)}`}>
                {statusLabel(file.status, intl.formatMessage)}
            </span>
            <span className={styles.fileMeta}>
                <span className={styles.fileLabel}>{name}</span>
                {file.oldPath ? (
                    <span className={styles.renameHint}>
                        {file.oldPath} → {file.path}
                    </span>
                ) : null}
            </span>
            {!file.binary && file.additions !== null && file.deletions !== null ? (
                <span className={styles.fileStats}>
                    <span className={styles.additions}>
                        {intl.formatMessage(messages.additions, { count: file.additions })}
                    </span>{' '}
                    <span className={styles.deletions}>
                        {intl.formatMessage(messages.deletions, { count: file.deletions })}
                    </span>
                </span>
            ) : null}
        </button>
    );
}

function FileTree({
    nodes,
    depth,
    collapsedPaths,
    onToggle,
    onSelect,
}: {
    nodes: FileTreeNode[];
    depth: number;
    collapsedPaths: Set<string>;
    onToggle: (path: string) => void;
    onSelect: (path: string) => void;
}) {
    return (
        <>
            {nodes.map((node) => {
                if (node.type === 'file') {
                    return (
                        <FileRow
                            key={node.file.path}
                            file={node.file}
                            name={node.name}
                            depth={depth}
                            onSelect={onSelect}
                        />
                    );
                }

                const collapsed = collapsedPaths.has(node.path);
                return (
                    <div key={node.path}>
                        <DirRow node={node} depth={depth} collapsed={collapsed} onToggle={onToggle} />
                        {collapsed ? null : (
                            <FileTree
                                nodes={node.children}
                                depth={depth + 1}
                                collapsedPaths={collapsedPaths}
                                onToggle={onToggle}
                                onSelect={onSelect}
                            />
                        )}
                    </div>
                );
            })}
        </>
    );
}

export function SessionCodeView({ sessionId }: SessionCodeViewProps) {
    const intl = useIntl();
    const [files, setFiles] = useState<SessionDiffFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPath, setSelectedPath] = useState<string | null>(null);
    const [fileDiff, setFileDiff] = useState<SessionFileDiff | null>(null);
    const [fileLoading, setFileLoading] = useState(false);
    const [collapsedPaths, setCollapsedPaths] = useState<Set<string>>(() => new Set());

    const tree = useMemo(() => buildFileTree(files), [files]);

    useEffect(() => {
        let cancelled = false;

        setLoading(true);
        getSessionDiff(sessionId)
            .then((diff) => {
                if (!cancelled) {
                    setFiles(diff.files);
                }
            })
            .catch((err: unknown) => {
                if (!cancelled) {
                    showToast(
                        'generic-error',
                        err instanceof Error ? err.message : intl.formatMessage(messages.loadFailed),
                    );
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [sessionId, intl]);

    useEffect(() => {
        if (!selectedPath) {
            setFileDiff(null);
            return;
        }

        let cancelled = false;
        setFileLoading(true);
        getSessionDiffFile(sessionId, selectedPath)
            .then((file) => {
                if (!cancelled) {
                    setFileDiff(file);
                }
            })
            .catch((err: unknown) => {
                if (!cancelled) {
                    setSelectedPath(null);
                    showToast(
                        'generic-error',
                        err instanceof Error ? err.message : intl.formatMessage(messages.loadFailed),
                    );
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setFileLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [sessionId, selectedPath, intl]);

    function refresh() {
        setLoading(true);
        getSessionDiff(sessionId)
            .then((diff) => {
                setFiles(diff.files);
                if (selectedPath && !diff.files.some((file) => file.path === selectedPath)) {
                    setSelectedPath(null);
                }
            })
            .catch((err: unknown) => {
                showToast(
                    'generic-error',
                    err instanceof Error ? err.message : intl.formatMessage(messages.loadFailed),
                );
            })
            .finally(() => {
                setLoading(false);
            });
    }

    function toggleFolder(path: string) {
        setCollapsedPaths((prev) => {
            const next = new Set(prev);
            if (next.has(path)) {
                next.delete(path);
            } else {
                next.add(path);
            }
            return next;
        });
    }

    return (
        <div className={styles.root}>
            <div className={selectedPath ? styles.panelHidden : styles.panel}>
                <div className={styles.toolbar}>
                    <p className={styles.toolbarTitle}>
                        {loading
                            ? intl.formatMessage(messages.loading)
                            : intl.formatMessage(messages.filesChanged, { count: files.length })}
                    </p>
                    <button type='button' className={styles.refreshButton} onClick={refresh} disabled={loading}>
                        {intl.formatMessage(messages.refresh)}
                    </button>
                </div>
                {loading ? (
                    <p className={styles.centered}>{intl.formatMessage(messages.loading)}</p>
                ) : files.length === 0 ? (
                    <p className={styles.centered}>{intl.formatMessage(messages.empty)}</p>
                ) : (
                    <div className={styles.fileList}>
                        <FileTree
                            nodes={tree}
                            depth={0}
                            collapsedPaths={collapsedPaths}
                            onToggle={toggleFolder}
                            onSelect={setSelectedPath}
                        />
                    </div>
                )}
            </div>

            {selectedPath ? (
                <div className={styles.panel}>
                    <div className={styles.fileHeader}>
                        <button
                            type='button'
                            className={styles.backButton}
                            onClick={() => setSelectedPath(null)}
                            aria-label={intl.formatMessage(messages.backToFiles)}
                        >
                            <BackIcon />
                        </button>
                        <span className={styles.fileHeaderPath}>{selectedPath}</span>
                    </div>
                    {fileLoading || !fileDiff ? (
                        <p className={styles.centered}>{intl.formatMessage(messages.loading)}</p>
                    ) : fileDiff.binary ? (
                        <p className={styles.centered}>{intl.formatMessage(messages.binaryFile)}</p>
                    ) : (
                        <div className={styles.editorWrap}>
                            <div className={styles.editorFill}>
                                <DiffEditor
                                    height='100%'
                                    width='100%'
                                    original={fileDiff.original}
                                    modified={fileDiff.modified}
                                    language={fileDiff.language}
                                    theme='vs-dark'
                                    options={{
                                        readOnly: true,
                                        renderSideBySide: false,
                                        wordWrap: 'on',
                                        wrappingIndent: 'same',
                                        fontSize: 11,
                                        lineHeight: 16,
                                        minimap: { enabled: false },
                                        scrollBeyondLastLine: false,
                                        renderOverviewRuler: false,
                                        overviewRulerLanes: 0,
                                        scrollbar: {
                                            verticalScrollbarSize: 6,
                                            horizontalScrollbarSize: 6,
                                        },
                                        padding: { top: 8, bottom: 8 },
                                        glyphMargin: false,
                                        folding: false,
                                        lineDecorationsWidth: 8,
                                        lineNumbersMinChars: 3,
                                        renderLineHighlight: 'none',
                                        contextmenu: false,
                                        automaticLayout: true,
                                        originalEditable: false,
                                    }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            ) : null}
        </div>
    );
}
