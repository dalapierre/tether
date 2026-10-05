import {
    getSessionDiff,
    getSessionDiffFile,
    type DiffFileStatus,
    type SessionDiffFile,
    type SessionFileDiff,
} from '@client/libs/api/sessions';
import { PanelResizeHandle, panelResizeHandleMessages } from '@client/components/panel-resize-handle';
import { Spinner } from '@client/components/spinner';
import { useIsDesktop } from '@client/libs/dom/useMediaQuery';
import {
    clampFileTreeWidthPx,
    getFileTreeWidthPx,
    setFileTreeWidthPx,
} from '@client/libs/layout/reviewLayoutPreferences';
import { setupMonaco } from '@client/libs/monaco/setup';
import { showToast } from '@client/modules/toast';
import { DiffEditor } from '@monaco-editor/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { buildFileTree, type FileTreeDirNode, type FileTreeNode } from './buildFileTree';
import { messages } from './sessionCodeView.messages';
import { styles } from './sessionCodeView.styles';
import type { SessionCodeViewProps } from './sessionCodeView.types';

setupMonaco();

const TREE_INDENT_PX = 12;
const TREE_BASE_PAD_PX = 12;
const DIFF_POLL_MS = 3000;

function fileListSignature(files: SessionDiffFile[]): string {
    return files
        .map(
            (file) =>
                `${file.path}\0${file.oldPath ?? ''}\0${file.status}\0${file.additions}\0${file.deletions}\0${file.binary}`,
        )
        .join('\n');
}

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
        <svg
            className={styles.backIcon}
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            aria-hidden='true'
        >
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
    selected,
    onSelect,
}: {
    file: SessionDiffFile;
    name: string;
    depth: number;
    selected: boolean;
    onSelect: (path: string) => void;
}) {
    const intl = useIntl();

    return (
        <button
            type='button'
            className={`${styles.treeRow} ${styles.fileButton}${selected ? ` ${styles.treeRowSelected}` : ''}`}
            style={{ paddingLeft: TREE_BASE_PAD_PX + depth * TREE_INDENT_PX }}
            onClick={() => onSelect(file.path)}
            aria-current={selected ? 'true' : undefined}
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
    selectedPath,
    collapsedPaths,
    onToggle,
    onSelect,
}: {
    nodes: FileTreeNode[];
    depth: number;
    selectedPath: string | null;
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
                            selected={selectedPath === node.file.path}
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
                                selectedPath={selectedPath}
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

export function SessionCodeView({ sessionId, onHasFilesChange }: SessionCodeViewProps) {
    const intl = useIntl();
    const isDesktop = useIsDesktop();
    const [files, setFiles] = useState<SessionDiffFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPath, setSelectedPath] = useState<string | null>(null);
    const [fileDiff, setFileDiff] = useState<SessionFileDiff | null>(null);
    const [fileLoading, setFileLoading] = useState(false);
    const [collapsedPaths, setCollapsedPaths] = useState<Set<string>>(() => new Set());
    const [fileTreeWidth, setFileTreeWidth] = useState(getFileTreeWidthPx);
    const fileTreeWidthRef = useRef(fileTreeWidth);

    const tree = useMemo(() => buildFileTree(files), [files]);
    fileTreeWidthRef.current = fileTreeWidth;
    const selectedPathRef = useRef(selectedPath);
    selectedPathRef.current = selectedPath;
    const filesSignatureRef = useRef(fileListSignature(files));

    const persistFileTreeWidth = useCallback(() => {
        setFileTreeWidthPx(fileTreeWidthRef.current);
    }, []);
    const hasFiles = files.length > 0;

    useEffect(() => {
        onHasFilesChange?.(hasFiles);
    }, [hasFiles, onHasFilesChange]);

    const applyDiffFiles = useCallback((nextFiles: SessionDiffFile[]) => {
        const nextSignature = fileListSignature(nextFiles);
        if (nextSignature === filesSignatureRef.current) {
            return false;
        }
        filesSignatureRef.current = nextSignature;
        setFiles(nextFiles);
        const selected = selectedPathRef.current;
        if (selected && !nextFiles.some((file) => file.path === selected)) {
            setSelectedPath(null);
        }
        return true;
    }, []);

    useEffect(() => {
        let cancelled = false;
        filesSignatureRef.current = '';

        const load = (initial: boolean) => {
            if (initial) {
                setLoading(true);
            }

            return getSessionDiff(sessionId)
                .then((diff) => {
                    if (!cancelled) {
                        applyDiffFiles(diff.files);
                    }
                })
                .catch((err: unknown) => {
                    if (!cancelled && initial) {
                        showToast(
                            'generic-error',
                            err instanceof Error ? err.message : intl.formatMessage(messages.loadFailed),
                        );
                    }
                })
                .finally(() => {
                    if (!cancelled && initial) {
                        setLoading(false);
                    }
                });
        };

        void load(true);
        const timer = window.setInterval(() => {
            void load(false);
        }, DIFF_POLL_MS);

        return () => {
            cancelled = true;
            window.clearInterval(timer);
        };
    }, [sessionId, intl, applyDiffFiles]);

    const loadingLabel = intl.formatMessage(messages.loading);

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

    // Keep the open file's contents fresh even when summary stats are unchanged.
    useEffect(() => {
        if (!selectedPath) return;

        let cancelled = false;
        const timer = window.setInterval(() => {
            getSessionDiffFile(sessionId, selectedPath)
                .then((file) => {
                    if (cancelled) return;
                    setFileDiff((prev) => {
                        if (
                            prev &&
                            prev.path === file.path &&
                            prev.original === file.original &&
                            prev.modified === file.modified &&
                            prev.status === file.status
                        ) {
                            return prev;
                        }
                        return file;
                    });
                })
                .catch(() => {
                    // Best-effort background refresh; keep the last good diff.
                });
        }, DIFF_POLL_MS);

        return () => {
            cancelled = true;
            window.clearInterval(timer);
        };
    }, [sessionId, selectedPath]);

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

    const listLoading = loading && files.length === 0;
    const editorEmptyMessage = !hasFiles ? intl.formatMessage(messages.empty) : intl.formatMessage(messages.selectFile);

    const showEditor = isDesktop || Boolean(selectedPath);
    const listPanelWrapClass = !isDesktop && selectedPath ? styles.listPanelWrapMobileHidden : styles.listPanelWrap;
    const listPanelClass = selectedPath ? styles.listPanelMobileHidden : styles.listPanel;
    const editorPanelClass = showEditor ? styles.editorPanel : styles.editorPanelMobileHidden;

    const listPanelWrapStyle = isDesktop ? { width: fileTreeWidth } : undefined;

    return (
        <div className={styles.root}>
            <div className={listPanelWrapClass} style={listPanelWrapStyle}>
                <div className={listPanelClass}>
                    <div className={styles.toolbar}>
                        <p className={styles.toolbarTitle}>
                            {hasFiles
                                ? intl.formatMessage(messages.filesChanged, { count: files.length })
                                : intl.formatMessage(messages.filesChangedTitle)}
                        </p>
                    </div>
                    {listLoading ? (
                        <Spinner label={loadingLabel} />
                    ) : files.length === 0 ? (
                        <p className={styles.centered}>{intl.formatMessage(messages.empty)}</p>
                    ) : (
                        <div className={styles.fileList}>
                            <FileTree
                                nodes={tree}
                                depth={0}
                                selectedPath={selectedPath}
                                collapsedPaths={collapsedPaths}
                                onToggle={toggleFolder}
                                onSelect={setSelectedPath}
                            />
                        </div>
                    )}
                </div>
                {isDesktop ? (
                    <PanelResizeHandle
                        edge='trailing'
                        className={styles.fileTreeResize}
                        ariaLabel={intl.formatMessage(panelResizeHandleMessages.resizeFileTree)}
                        onResize={(delta) => setFileTreeWidth((width) => clampFileTreeWidthPx(width + delta))}
                        onResizeEnd={persistFileTreeWidth}
                    />
                ) : null}
            </div>

            <div className={editorPanelClass}>
                {selectedPath ? (
                    <>
                        <div className={styles.fileHeader}>
                            <button type='button' className={styles.backButton} onClick={() => setSelectedPath(null)}>
                                <BackIcon />
                                {intl.formatMessage(messages.backToFiles)}
                            </button>
                            <span className={styles.fileHeaderPath}>{selectedPath}</span>
                        </div>
                        {fileLoading || !fileDiff ? (
                            <Spinner label={loadingLabel} />
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
                                            renderSideBySide: isDesktop,
                                            wordWrap: 'on',
                                            wrappingIndent: 'same',
                                            fontSize: isDesktop ? 13 : 11,
                                            lineHeight: isDesktop ? 18 : 16,
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
                    </>
                ) : listLoading ? (
                    <Spinner label={loadingLabel} />
                ) : (
                    <p className={styles.centered}>{editorEmptyMessage}</p>
                )}
            </div>
        </div>
    );
}
