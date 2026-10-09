import { ApiError } from '@client/libs/api/client';
import {
    discardSessionDiffFile,
    getSessionDiffFile,
    type DiffFileStatus,
    type SessionDiffFile,
    type SessionFileDiff,
} from '@client/libs/api/sessions';
import { ConfirmDialog } from '@client/components/confirm-dialog';
import { PanelResizeHandle, panelResizeHandleMessages } from '@client/components/panel-resize-handle';
import { Spinner } from '@client/components/spinner';
import { useIsDesktop } from '@client/libs/dom/useMediaQuery';
import {
    eventMatchesKeybind,
    isTerminalInsertTarget,
    modifierChordHeld,
    useKeybind,
    useKeybinds,
} from '@client/libs/keybinds';
import {
    clampFileTreeWidthPx,
    getDiffViewMode,
    getFileTreeWidthPx,
    getReviewedDiffFiles,
    getSelectedDiffFileState,
    getSelectedDiffPath,
    setDiffViewMode,
    setFileTreeWidthPx,
    setReviewedDiffFiles,
    setSelectedDiffFileState,
    type DiffViewMode,
} from '@client/libs/layout/reviewLayoutPreferences';
import { setupMonaco, TETHER_DIFF_THEME } from '@client/libs/monaco/setup';
import {
    bumpDiffGeneration,
    ensureSessionDiff,
    getDiffGeneration,
    subscribe as subscribeSessionEvents,
} from '@client/modules/session-events';
import { showToast } from '@client/modules/toast';
import { DiffEditor } from '@monaco-editor/react';
import type { editor as MonacoEditor } from 'monaco-editor';
import {
    Suspense,
    lazy,
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
    useSyncExternalStore,
    type ReactNode,
} from 'react';
import { useIntl } from 'react-intl';
import { buildFileTree, type FileTreeDirNode, type FileTreeNode } from './buildFileTree';
import { CommentDialog } from './comment-dialog';
import { applyDiffViewMode } from './filterDiffByMode';
import { messages } from './sessionCodeView.messages';
import { styles } from './sessionCodeView.styles';
import type { SessionCodeViewProps } from './sessionCodeView.types';

const MarkdownPreview = lazy(() => import('./markdownPreview').then((m) => ({ default: m.MarkdownPreview })));
const TREE_INDENT_PX = 12;
const TREE_BASE_PAD_PX = 12;
/** Continuous scroll speed while a scroll keybind is held. */
const FILE_SCROLL_PX_PER_SEC = 640;
/** Coalesce scroll position writes while the user is scrolling. */
const SCROLL_PERSIST_MS = 150;
type SelectionCommentState = {
    content: string;
    fileName: string;
    startLine: number;
    endLine: number;
    top: number;
    left: number;
    /** When false, the button sits below the first selected line (not enough room above). */
    placeAbove: boolean;
};

type PendingCommentState = {
    content: string;
    fileName: string;
    startLine: number;
    endLine: number;
};

function formatCodeReviewPrompt(fileName: string, content: string, comment: string): string {
    return [
        '[Code review] - A software engineer reviewed the code and applied the following comments to some of the changes.',
        'Do not modify the code unless the comment explicitly asks you to make a change.',
        `file: ${fileName}`,
        `content: ${content}`,
        `comment: ${comment}`,
    ].join('\n');
}

/** Whole-line drags often end at column 1 of the next line — treat that as the prior line. */
function selectionLineRange(selection: {
    getStartPosition: () => { lineNumber: number; column: number };
    getEndPosition: () => { lineNumber: number; column: number };
}): { startLine: number; endLine: number } {
    const start = selection.getStartPosition();
    const end = selection.getEndPosition();
    let endLine = end.lineNumber;
    if (end.column === 1 && endLine > start.lineNumber) {
        endLine -= 1;
    }
    return { startLine: start.lineNumber, endLine };
}

function readSelectionComment(
    editor: MonacoEditor.IStandaloneCodeEditor,
    fileName: string | null,
    overlayContainer: HTMLElement | null,
): SelectionCommentState | null {
    if (!fileName || !overlayContainer) return null;
    const model = editor.getModel();
    const selection = editor.getSelection();
    if (!model || !selection || selection.isEmpty()) return null;

    const content = model.getValueInRange(selection);
    if (!content.trim()) return null;

    const editorDom = editor.getDomNode();
    if (!editorDom) return null;

    const startPos = selection.getStartPosition();
    const endPos = selection.getEndPosition();
    const startVisible = editor.getScrolledVisiblePosition(startPos);
    if (!startVisible) return null;

    const endColumnOnStartLine =
        startPos.lineNumber === endPos.lineNumber ? endPos.column : model.getLineMaxColumn(startPos.lineNumber);
    const endVisible = editor.getScrolledVisiblePosition({
        lineNumber: startPos.lineNumber,
        column: endColumnOnStartLine,
    });
    const right = endVisible?.left ?? startVisible.left;
    const { startLine, endLine } = selectionLineRange(selection);

    // getScrolledVisiblePosition is relative to the modified editor pane. In split
    // view that pane is only the right half of editorWrap, so map into overlay space.
    const editorRect = editorDom.getBoundingClientRect();
    const overlayRect = overlayContainer.getBoundingClientRect();
    const offsetLeft = editorRect.left - overlayRect.left;
    const offsetTop = editorRect.top - overlayRect.top;
    const selectionTop = offsetTop + startVisible.top;
    const selectionHeight = startVisible.height || 18;
    // Keep the floating button inside the wrap: above the selection when there is
    // room, otherwise just below the first highlighted line.
    const buttonHeight = 36;
    const gap = 4;
    const placeAbove = selectionTop >= buttonHeight + gap;

    return {
        content,
        fileName,
        startLine,
        endLine,
        top: placeAbove ? selectionTop - gap : selectionTop + selectionHeight + gap,
        left: offsetLeft + (startVisible.left + right) / 2,
        placeAbove,
    };
}

type SessionDiffEditorProps = {
    original: string;
    modified: string;
    language: string;
    options: MonacoEditor.IDiffEditorConstructionOptions;
    onMount: (editor: MonacoEditor.IStandaloneDiffEditor) => void;
    onUnmount?: () => void;
};

/**
 * DiffEditor wrapper that avoids a @monaco-editor/react teardown bug:
 * the library disposes TextModels before DiffEditorWidget, which throws
 * "TextModel got disposed before DiffEditorWidget model got reset".
 * Keep models during wrapper cleanup, then dispose them after the widget.
 */
function SessionDiffEditor({ original, modified, language, options, onMount, onUnmount }: SessionDiffEditorProps) {
    const intl = useIntl();
    const editorRef = useRef<MonacoEditor.IStandaloneDiffEditor | null>(null);
    const onUnmountRef = useRef(onUnmount);
    onUnmountRef.current = onUnmount;

    setupMonaco();

    useEffect(() => {
        return () => {
            const editor = editorRef.current;
            editorRef.current = null;
            onUnmountRef.current?.();
            if (!editor) {
                return;
            }
            const model = editor.getModel();
            queueMicrotask(() => {
                if (model?.original && !model.original.isDisposed()) {
                    model.original.dispose();
                }
                if (model?.modified && !model.modified.isDisposed()) {
                    model.modified.dispose();
                }
            });
        };
    }, []);

    const handleMount = useCallback(
        (editor: MonacoEditor.IStandaloneDiffEditor) => {
            editorRef.current = editor;
            onMount(editor);
        },
        [onMount],
    );

    return (
        <DiffEditor
            height='100%'
            width='100%'
            original={original}
            modified={modified}
            language={language}
            theme={TETHER_DIFF_THEME}
            options={options}
            onMount={handleMount}
            keepCurrentOriginalModel
            keepCurrentModifiedModel
            loading={
                <div className={styles.editorFill}>
                    <Spinner label={intl.formatMessage(messages.loading)} />
                </div>
            }
        />
    );
}

type MarkdownViewMode = 'code' | 'preview';

function isMarkdownPath(path: string | null | undefined): boolean {
    if (!path) return false;
    return /\.(md|markdown)$/i.test(path);
}

function markdownPreviewContent(file: SessionFileDiff): string {
    if (file.status === 'deleted') {
        return file.original;
    }
    return file.modified;
}

function normalizedScrollRatio(scrollTop: number, scrollHeight: number, clientHeight: number): number {
    const range = scrollHeight - clientHeight;
    if (range <= 0) {
        return 0;
    }
    return Math.min(1, Math.max(0, scrollTop / range));
}

function scrollTopForRatio(ratio: number, scrollHeight: number, clientHeight: number): number {
    const range = scrollHeight - clientHeight;
    if (range <= 0) {
        return 0;
    }
    return ratio * range;
}

function getDiffEditorScrollRatio(diffEditor: MonacoEditor.IStandaloneDiffEditor | null): number | null {
    if (!diffEditor) {
        return null;
    }
    const codeEditor = diffEditor.getModifiedEditor();
    const height = codeEditor.getLayoutInfo().height;
    if (height <= 0) {
        return null;
    }
    return normalizedScrollRatio(codeEditor.getScrollTop(), codeEditor.getScrollHeight(), height);
}

function setDiffEditorScrollRatio(diffEditor: MonacoEditor.IStandaloneDiffEditor | null, ratio: number): void {
    if (!diffEditor) {
        return;
    }
    const codeEditor = diffEditor.getModifiedEditor();
    const height = codeEditor.getLayoutInfo().height;
    if (height <= 0) {
        return;
    }
    codeEditor.setScrollTop(scrollTopForRatio(ratio, codeEditor.getScrollHeight(), height));
}

/** First visible line — stable across pane hide/show when word-wrap recalculates scrollHeight. */
function getDiffEditorAnchorLine(diffEditor: MonacoEditor.IStandaloneDiffEditor | null): number | null {
    if (!diffEditor) {
        return null;
    }
    const codeEditor = diffEditor.getModifiedEditor();
    if (codeEditor.getLayoutInfo().height <= 0) {
        return null;
    }
    const ranges = codeEditor.getVisibleRanges();
    const line = ranges[0]?.startLineNumber;
    return line != null && line > 0 ? line : null;
}

function setDiffEditorAnchorLine(diffEditor: MonacoEditor.IStandaloneDiffEditor | null, line: number): void {
    if (!diffEditor || line <= 0) {
        return;
    }
    const codeEditor = diffEditor.getModifiedEditor();
    if (codeEditor.getLayoutInfo().height <= 0) {
        return;
    }
    codeEditor.revealLineNearTop(line);
}

function setDiffEditorScrollBy(diffEditor: MonacoEditor.IStandaloneDiffEditor | null, delta: number): void {
    if (!diffEditor) {
        return;
    }
    const modified = diffEditor.getModifiedEditor();
    const original = diffEditor.getOriginalEditor();
    const next = modified.getScrollTop() + delta;
    // Set both sides in the same turn so the diff view doesn't briefly desync.
    original.setScrollTop(next);
    modified.setScrollTop(next);
}

function setElementScrollBy(element: HTMLElement | null, delta: number): void {
    if (!element) {
        return;
    }
    element.scrollTop += delta;
}

function getElementScrollRatio(element: HTMLElement | null): number | null {
    if (!element || element.clientHeight <= 0) {
        return null;
    }
    return normalizedScrollRatio(element.scrollTop, element.scrollHeight, element.clientHeight);
}

function setElementScrollRatio(element: HTMLElement | null, ratio: number): void {
    if (!element || element.clientHeight <= 0) {
        return;
    }
    element.scrollTop = scrollTopForRatio(ratio, element.scrollHeight, element.clientHeight);
}

function applyScrollRatio(
    target: 'code' | 'preview',
    ratio: number,
    refs: {
        diffEditor: MonacoEditor.IStandaloneDiffEditor | null;
        preview: HTMLDivElement | null;
    },
): void {
    if (target === 'preview') {
        setElementScrollRatio(refs.preview, ratio);
    } else {
        setDiffEditorScrollRatio(refs.diffEditor, ratio);
    }
}

function fileFingerprint(file: SessionDiffFile): string {
    return `${file.oldPath ?? ''}\0${file.status}\0${file.additions}\0${file.deletions}\0${file.binary}`;
}

function fileListSignature(files: SessionDiffFile[]): string {
    return files.map((file) => `${file.path}\0${fileFingerprint(file)}`).join('\n');
}

function fileContentFingerprint(file: SessionFileDiff): string {
    return `${file.status}\0${file.original}\0${file.modified}\0${file.binary}`;
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

function MarkdownCodeViewIcon() {
    return (
        <svg
            className={styles.fileHeaderModeIcon}
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='1.75'
            aria-hidden='true'
        >
            <path
                strokeLinecap='round'
                strokeLinejoin='round'
                d='M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5'
            />
        </svg>
    );
}

function MarkdownPreviewViewIcon() {
    return (
        <svg
            className={styles.fileHeaderModeIcon}
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='1.75'
            aria-hidden='true'
        >
            <path
                strokeLinecap='round'
                strokeLinejoin='round'
                d='M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125V4.875a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z'
            />
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

function CollapseAllFoldersIcon() {
    return (
        <svg
            className={styles.collapseAllIcon}
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='1.75'
            aria-hidden='true'
        >
            <path strokeLinecap='round' strokeLinejoin='round' d='M3.75 6.75h10.5M3.75 12h7.5m-7.5 5.25h4.5' />
            <path
                strokeLinecap='round'
                strokeLinejoin='round'
                d='m19.5 8.25-2.25 2.25L15 8.25m4.5 7.5-2.25-2.25L15 15.75'
            />
        </svg>
    );
}

function ResetReviewsIcon() {
    return (
        <svg
            className={styles.resetReviewsIcon}
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='1.75'
            aria-hidden='true'
        >
            <path
                strokeLinecap='round'
                strokeLinejoin='round'
                d='M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182'
            />
        </svg>
    );
}

function FullscreenIcon() {
    return (
        <svg
            className={styles.fullscreenIcon}
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='1.75'
            aria-hidden='true'
        >
            <path
                strokeLinecap='round'
                strokeLinejoin='round'
                d='M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15'
            />
        </svg>
    );
}

function ExitFullscreenIcon() {
    return (
        <svg
            className={styles.fullscreenIcon}
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='1.75'
            aria-hidden='true'
        >
            <path
                strokeLinecap='round'
                strokeLinejoin='round'
                d='M9 9V4.5M9 9H4.5M9 9 3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5 5.25 5.25'
            />
        </svg>
    );
}

function DiffViewSplitIcon() {
    return (
        <svg
            className={styles.diffViewModeIcon}
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='1.75'
            aria-hidden='true'
        >
            <path strokeLinecap='round' strokeLinejoin='round' d='M3.75 4.5h6.75v15H3.75zM13.5 4.5h6.75v15H13.5z' />
        </svg>
    );
}

function DiffViewNegativeIcon() {
    return (
        <svg
            className={styles.diffViewModeIcon}
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='1.75'
            aria-hidden='true'
        >
            <path strokeLinecap='round' strokeLinejoin='round' d='M5 12h14' />
        </svg>
    );
}

function DiffViewPositiveIcon() {
    return (
        <svg
            className={styles.diffViewModeIcon}
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='1.75'
            aria-hidden='true'
        >
            <path strokeLinecap='round' strokeLinejoin='round' d='M12 5v14M5 12h14' />
        </svg>
    );
}

function DiffViewModeControls({ mode, onChange }: { mode: DiffViewMode; onChange: (mode: DiffViewMode) => void }) {
    const intl = useIntl();
    const options: { value: DiffViewMode; label: string; icon: ReactNode }[] = [
        {
            value: 'positive',
            label: intl.formatMessage(messages.diffViewPositive),
            icon: <DiffViewPositiveIcon />,
        },
        {
            value: 'negative',
            label: intl.formatMessage(messages.diffViewNegative),
            icon: <DiffViewNegativeIcon />,
        },
        {
            value: 'split',
            label: intl.formatMessage(messages.diffViewSplit),
            icon: <DiffViewSplitIcon />,
        },
    ];

    return (
        <div className={styles.diffViewModes} role='group' aria-label={intl.formatMessage(messages.diffViewModes)}>
            {options.map((option) => {
                const active = option.value === mode;
                return (
                    <button
                        key={option.value}
                        type='button'
                        className={`${styles.diffViewModeButton}${active ? ` ${styles.diffViewModeButtonActive}` : ''}`}
                        title={option.label}
                        aria-label={option.label}
                        aria-pressed={active}
                        onClick={() => onChange(option.value)}
                    >
                        {option.icon}
                    </button>
                );
            })}
        </div>
    );
}

function collectDirPaths(nodes: FileTreeNode[]): string[] {
    const paths: string[] = [];
    for (const node of nodes) {
        if (node.type === 'dir') {
            paths.push(node.path);
            paths.push(...collectDirPaths(node.children));
        }
    }
    return paths;
}

function DiscardIcon() {
    return (
        <svg
            className={styles.discardIcon}
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='1.5'
            aria-hidden='true'
        >
            <path strokeLinecap='round' strokeLinejoin='round' d='M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3' />
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
            <span className={`${styles.nodeLabel} ${styles.dirLabel}`} title={node.name}>
                {node.name}
            </span>
        </button>
    );
}

function FileRow({
    file,
    name,
    depth,
    selected,
    reviewed,
    onSelect,
    onDiscard,
}: {
    file: SessionDiffFile;
    name: string;
    depth: number;
    selected: boolean;
    reviewed: boolean;
    onSelect: (path: string) => void;
    onDiscard: (path: string) => void;
}) {
    const intl = useIntl();
    const discardLabel = intl.formatMessage(messages.discardChange);
    const rowTone = reviewed
        ? selected
            ? styles.treeRowSelectedReviewed
            : styles.treeRowReviewed
        : selected
          ? styles.treeRowSelected
          : '';

    return (
        <div
            className={`${styles.treeRow} ${styles.fileRow}${rowTone ? ` ${rowTone}` : ''}`}
            style={{ paddingLeft: TREE_BASE_PAD_PX + depth * TREE_INDENT_PX }}
        >
            <button
                type='button'
                className={styles.fileSelect}
                onMouseDown={(event) => {
                    // Keep focus out of the file tree so review keybinds (e.g. "r")
                    // don't suddenly show a focus ring on the file name.
                    event.preventDefault();
                }}
                onClick={() => onSelect(file.path)}
                aria-current={selected ? 'true' : undefined}
            >
                <span className={styles.chevronSpacer} />
                <span className={`${styles.statusBadge} ${statusClass(file.status)}`}>
                    {statusLabel(file.status, intl.formatMessage)}
                </span>
                <span className={styles.fileMeta}>
                    <span className={styles.fileLabel} title={name}>
                        {name}
                    </span>
                    {file.oldPath ? (
                        <span className={styles.renameHint} title={`${file.oldPath} → ${file.path}`}>
                            {file.oldPath} → {file.path}
                        </span>
                    ) : null}
                </span>
            </button>
            <span className={styles.fileActions}>
                <button
                    type='button'
                    className={styles.discardButton}
                    title={discardLabel}
                    aria-label={discardLabel}
                    onClick={(event) => {
                        event.stopPropagation();
                        onDiscard(file.path);
                    }}
                >
                    <DiscardIcon />
                </button>
                {!file.binary && file.additions !== null && file.deletions !== null ? (
                    <span className={styles.fileStats}>
                        <span className={styles.additions}>
                            {intl.formatMessage(messages.additions, { count: file.additions })}
                        </span>
                        {file.deletions > 0 ? (
                            <>
                                {' '}
                                <span className={styles.deletions}>
                                    {intl.formatMessage(messages.deletions, { count: file.deletions })}
                                </span>
                            </>
                        ) : null}
                    </span>
                ) : null}
            </span>
        </div>
    );
}

function FileTree({
    nodes,
    depth,
    selectedPath,
    reviewedPaths,
    collapsedPaths,
    onToggle,
    onSelect,
    onDiscard,
}: {
    nodes: FileTreeNode[];
    depth: number;
    selectedPath: string | null;
    reviewedPaths: ReadonlyMap<string, string>;
    collapsedPaths: Set<string>;
    onToggle: (path: string) => void;
    onSelect: (path: string) => void;
    onDiscard: (path: string) => void;
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
                            reviewed={reviewedPaths.has(node.file.path)}
                            onSelect={onSelect}
                            onDiscard={onDiscard}
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
                                reviewedPaths={reviewedPaths}
                                collapsedPaths={collapsedPaths}
                                onToggle={onToggle}
                                onSelect={onSelect}
                                onDiscard={onDiscard}
                            />
                        )}
                    </div>
                );
            })}
        </>
    );
}

export function SessionCodeView({
    sessionId,
    onHasFilesChange,
    keybindsEnabled = true,
    onSubmitAgentPrompt,
    fullscreen = false,
    onToggleFullscreen,
}: SessionCodeViewProps) {
    const intl = useIntl();
    const isDesktop = useIsDesktop();
    const { keybinds } = useKeybinds();
    const diffGeneration = useSyncExternalStore(
        subscribeSessionEvents,
        () => getDiffGeneration(sessionId),
        () => getDiffGeneration(sessionId),
    );
    const [files, setFiles] = useState<SessionDiffFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPath, setSelectedPath] = useState<string | null>(() => getSelectedDiffPath(sessionId));
    const [fileDiff, setFileDiff] = useState<SessionFileDiff | null>(null);
    const [fileLoading, setFileLoading] = useState(false);
    const [collapsedPaths, setCollapsedPaths] = useState<Set<string>>(() => new Set());
    const [reviewedFingerprints, setReviewedFingerprints] = useState<Map<string, string>>(() =>
        getReviewedDiffFiles(sessionId),
    );
    const [fileTreeWidth, setFileTreeWidth] = useState(getFileTreeWidthPx);
    const [pendingDiscardPath, setPendingDiscardPath] = useState<string | null>(null);
    const [discarding, setDiscarding] = useState(false);
    const [markdownViewMode, setMarkdownViewMode] = useState<MarkdownViewMode>('code');
    const [diffViewMode, setDiffViewModeState] = useState<DiffViewMode>(getDiffViewMode);
    const [selectionComment, setSelectionComment] = useState<SelectionCommentState | null>(null);
    const [pendingComment, setPendingComment] = useState<PendingCommentState | null>(null);
    const diffEditorRef = useRef<MonacoEditor.IStandaloneDiffEditor | null>(null);
    const editorWrapRef = useRef<HTMLDivElement | null>(null);
    const selectionDisposablesRef = useRef<{ dispose: () => void }[]>([]);
    const previewScrollRef = useRef<HTMLDivElement | null>(null);
    const fileListRef = useRef<HTMLDivElement | null>(null);
    const reviewedCheckboxRef = useRef<HTMLInputElement | null>(null);
    const pendingScrollRatioRef = useRef<number | null>(null);
    /** Scroll position for the open file; survives desktop pane `display:none`. */
    const scrollRatioRef = useRef(0);
    const scrollAnchorLineRef = useRef(1);
    const paneActiveRef = useRef(keybindsEnabled);
    const restoringScrollRef = useRef(false);
    const scrollPersistTimerRef = useRef<number | null>(null);
    const fileTreeWidthRef = useRef(fileTreeWidth);

    // Keep in sync during render so hide-time Monaco scroll events (0-height) are ignored.
    paneActiveRef.current = keybindsEnabled;

    const tree = useMemo(() => buildFileTree(files), [files]);
    const dirPaths = useMemo(() => collectDirPaths(tree), [tree]);
    fileTreeWidthRef.current = fileTreeWidth;
    const selectedPathRef = useRef(selectedPath);
    selectedPathRef.current = selectedPath;
    const filesSignatureRef = useRef(fileListSignature(files));
    /** Bumped to drop in-flight summary responses that must not overwrite newer state (e.g. after discard). */
    const diffFilesRequestIdRef = useRef(0);
    const fileContentFingerprintRef = useRef<string | null>(null);

    const persistFileTreeWidth = useCallback(() => {
        setFileTreeWidthPx(fileTreeWidthRef.current);
    }, []);
    const hasFiles = files.length > 0;

    useEffect(() => {
        onHasFilesChange?.(hasFiles);
    }, [hasFiles, onHasFilesChange]);

    useEffect(() => {
        setSelectedPath(getSelectedDiffPath(sessionId));
        setReviewedFingerprints(getReviewedDiffFiles(sessionId));
    }, [sessionId]);

    const updateReviewedFingerprints = useCallback(
        (updater: (prev: Map<string, string>) => Map<string, string>) => {
            setReviewedFingerprints((prev) => {
                const next = updater(prev);
                if (next === prev) {
                    return prev;
                }
                setReviewedDiffFiles(sessionId, next);
                return next;
            });
        },
        [sessionId],
    );

    const selectPath = useCallback(
        (path: string | null) => {
            if (scrollPersistTimerRef.current != null) {
                window.clearTimeout(scrollPersistTimerRef.current);
                scrollPersistTimerRef.current = null;
            }
            scrollRatioRef.current = 0;
            scrollAnchorLineRef.current = 1;
            setSelectedPath(path);
            if (!path) {
                setSelectedDiffFileState(sessionId, null);
                return;
            }
            setSelectedDiffFileState(sessionId, {
                path,
                anchorLine: 1,
                scrollRatio: 0,
            });
        },
        [sessionId],
    );

    const persistScrollPosition = useCallback(() => {
        const path = selectedPathRef.current;
        if (!path) {
            return;
        }
        setSelectedDiffFileState(sessionId, {
            path,
            anchorLine: scrollAnchorLineRef.current,
            scrollRatio: scrollRatioRef.current,
        });
    }, [sessionId]);

    const schedulePersistScroll = useCallback(() => {
        if (scrollPersistTimerRef.current != null) {
            return;
        }
        const pathAtSchedule = selectedPathRef.current;
        scrollPersistTimerRef.current = window.setTimeout(() => {
            scrollPersistTimerRef.current = null;
            if (!pathAtSchedule || selectedPathRef.current !== pathAtSchedule) {
                return;
            }
            persistScrollPosition();
        }, SCROLL_PERSIST_MS);
    }, [persistScrollPosition]);

    useEffect(() => {
        return () => {
            if (scrollPersistTimerRef.current != null) {
                window.clearTimeout(scrollPersistTimerRef.current);
                scrollPersistTimerRef.current = null;
                persistScrollPosition();
            }
        };
    }, [sessionId, persistScrollPosition]);

    const applyDiffFiles = useCallback(
        (nextFiles: SessionDiffFile[]) => {
            const nextSignature = fileListSignature(nextFiles);
            if (nextSignature === filesSignatureRef.current) {
                return false;
            }
            filesSignatureRef.current = nextSignature;
            setFiles(nextFiles);
            const nextByPath = new Map(nextFiles.map((file) => [file.path, file]));
            updateReviewedFingerprints((prev) => {
                if (prev.size === 0) return prev;
                let changed = false;
                const next = new Map<string, string>();
                for (const [path, fingerprint] of prev) {
                    const file = nextByPath.get(path);
                    if (!file || fileFingerprint(file) !== fingerprint) {
                        changed = true;
                        continue;
                    }
                    next.set(path, fingerprint);
                }
                return changed ? next : prev;
            });
            const selected = selectedPathRef.current;
            if (selected && !nextByPath.has(selected)) {
                selectPath(null);
            }
            return true;
        },
        [selectPath, updateReviewedFingerprints],
    );

    useEffect(() => {
        let cancelled = false;
        const hadFiles = filesSignatureRef.current !== '';
        filesSignatureRef.current = '';
        // Invalidate any in-flight summary from a previous session/effect.
        const requestId = ++diffFilesRequestIdRef.current;
        if (!hadFiles) {
            setLoading(true);
        }

        ensureSessionDiff(sessionId, diffGeneration)
            .then((state) => {
                if (cancelled || requestId !== diffFilesRequestIdRef.current) return;
                if (state.error && !state.summary) {
                    showToast('generic-error', state.error);
                    return;
                }
                // Keep prior files while a cold refresh is still pending with an empty placeholder.
                if (state.pending && (!state.summary || state.summary.files.length === 0) && hadFiles) {
                    return;
                }
                if (state.summary) {
                    applyDiffFiles(state.summary.files);
                }
            })
            .finally(() => {
                if (!cancelled && requestId === diffFilesRequestIdRef.current) {
                    setLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [sessionId, intl, applyDiffFiles, diffGeneration]);

    const loadingLabel = intl.formatMessage(messages.loading);

    useEffect(() => {
        if (!selectedPath) {
            setFileDiff(null);
            return;
        }

        const abort = new AbortController();
        setFileLoading(true);
        getSessionDiffFile(sessionId, selectedPath, { signal: abort.signal })
            .then((file) => {
                if (!abort.signal.aborted) {
                    setFileDiff(file);
                }
            })
            .catch((err: unknown) => {
                if (abort.signal.aborted) return;
                selectPath(null);
                showToast(
                    'generic-error',
                    err instanceof Error ? err.message : intl.formatMessage(messages.loadFailed),
                );
            })
            .finally(() => {
                if (!abort.signal.aborted) {
                    setFileLoading(false);
                }
            });

        return () => {
            abort.abort();
        };
    }, [sessionId, selectedPath, intl, selectPath]);

    useEffect(() => {
        setMarkdownViewMode('code');
        pendingScrollRatioRef.current = null;

        const stored = selectedPath ? getSelectedDiffFileState(sessionId) : null;
        if (stored && stored.path === selectedPath) {
            scrollRatioRef.current = stored.scrollRatio;
            scrollAnchorLineRef.current = stored.anchorLine;
        } else {
            scrollRatioRef.current = 0;
            scrollAnchorLineRef.current = 1;
        }
    }, [selectedPath, sessionId]);

    const showingMarkdownPreview =
        isMarkdownPath(selectedPath) && markdownViewMode === 'preview' && Boolean(fileDiff && !fileDiff.binary);

    const rememberScrollRatio = useCallback(
        (ratio: number | null) => {
            if (ratio === null || restoringScrollRef.current || !paneActiveRef.current) {
                return;
            }
            scrollRatioRef.current = ratio;
            schedulePersistScroll();
        },
        [schedulePersistScroll],
    );

    const rememberScrollAnchorLine = useCallback(
        (line: number | null) => {
            if (line == null || restoringScrollRef.current || !paneActiveRef.current) {
                return;
            }
            scrollAnchorLineRef.current = line;
            schedulePersistScroll();
        },
        [schedulePersistScroll],
    );

    const restoreScrollPosition = useCallback(() => {
        let frames = 0;
        restoringScrollRef.current = true;

        const apply = () => {
            if (!paneActiveRef.current) {
                restoringScrollRef.current = false;
                return;
            }

            if (showingMarkdownPreview) {
                const ratio = scrollRatioRef.current;
                const preview = previewScrollRef.current;
                if (!preview || preview.clientHeight <= 0) {
                    if (frames++ < 60) {
                        requestAnimationFrame(apply);
                        return;
                    }
                    restoringScrollRef.current = false;
                    return;
                }
                if (ratio > 0) {
                    setElementScrollRatio(preview, ratio);
                    requestAnimationFrame(() => {
                        setElementScrollRatio(preview, ratio);
                        restoringScrollRef.current = false;
                    });
                    return;
                }
                restoringScrollRef.current = false;
                return;
            }

            const diffEditor = diffEditorRef.current;
            const line = scrollAnchorLineRef.current;
            if (!diffEditor || diffEditor.getModifiedEditor().getLayoutInfo().height <= 0) {
                if (frames++ < 60) {
                    requestAnimationFrame(apply);
                    return;
                }
                restoringScrollRef.current = false;
                return;
            }

            if (line > 1) {
                setDiffEditorAnchorLine(diffEditor, line);
                requestAnimationFrame(() => {
                    setDiffEditorAnchorLine(diffEditor, line);
                    requestAnimationFrame(() => {
                        restoringScrollRef.current = false;
                    });
                });
                return;
            }

            restoringScrollRef.current = false;
        };

        requestAnimationFrame(apply);
    }, [showingMarkdownPreview]);

    const syncSelectionComment = useCallback((editor: MonacoEditor.IStandaloneDiffEditor | null) => {
        if (!editor || !paneActiveRef.current) {
            setSelectionComment(null);
            return;
        }
        setSelectionComment(
            readSelectionComment(editor.getModifiedEditor(), selectedPathRef.current, editorWrapRef.current),
        );
    }, []);

    const handleDiffEditorMount = useCallback(
        (editor: MonacoEditor.IStandaloneDiffEditor) => {
            for (const disposable of selectionDisposablesRef.current) {
                disposable.dispose();
            }
            selectionDisposablesRef.current = [];

            diffEditorRef.current = editor;
            const modified = editor.getModifiedEditor();
            selectionDisposablesRef.current = [
                modified.onDidScrollChange(() => {
                    rememberScrollAnchorLine(getDiffEditorAnchorLine(editor));
                    rememberScrollRatio(getDiffEditorScrollRatio(editor));
                    syncSelectionComment(editor);
                }),
                modified.onDidChangeCursorSelection(() => {
                    syncSelectionComment(editor);
                }),
                modified.onDidLayoutChange(() => {
                    syncSelectionComment(editor);
                }),
            ];
            syncSelectionComment(editor);
            if (paneActiveRef.current) {
                restoreScrollPosition();
            }
        },
        [rememberScrollAnchorLine, rememberScrollRatio, restoreScrollPosition, syncSelectionComment],
    );

    const handleDiffEditorUnmount = useCallback(() => {
        for (const disposable of selectionDisposablesRef.current) {
            disposable.dispose();
        }
        selectionDisposablesRef.current = [];
        diffEditorRef.current = null;
        setSelectionComment(null);
    }, []);

    // Split/unified layout changes shift the modified pane inside editorWrap; remap the button.
    useLayoutEffect(() => {
        syncSelectionComment(diffEditorRef.current);
    }, [diffViewMode, isDesktop, fileTreeWidth, fullscreen, syncSelectionComment]);

    const openCommentDialog = useCallback(() => {
        if (!selectionComment) return;
        setPendingComment({
            content: selectionComment.content,
            fileName: selectionComment.fileName,
            startLine: selectionComment.startLine,
            endLine: selectionComment.endLine,
        });
    }, [selectionComment]);

    const closeCommentDialog = useCallback(() => {
        setPendingComment(null);
    }, []);

    const submitComment = useCallback(
        (comment: string) => {
            if (!pendingComment) return;
            onSubmitAgentPrompt?.(formatCodeReviewPrompt(pendingComment.fileName, pendingComment.content, comment));
            setPendingComment(null);
            setSelectionComment(null);
            const modified = diffEditorRef.current?.getModifiedEditor();
            const selection = modified?.getSelection();
            if (modified && selection) {
                modified.setPosition(selection.getEndPosition());
            }
        },
        [onSubmitAgentPrompt, pendingComment],
    );

    const handleMarkdownViewModeChange = useCallback(
        (next: MarkdownViewMode) => {
            if (next === markdownViewMode) {
                return;
            }
            if (next === 'preview') {
                const ratio = getDiffEditorScrollRatio(diffEditorRef.current);
                if (ratio !== null) {
                    pendingScrollRatioRef.current = ratio;
                }
                setSelectionComment(null);
            } else {
                const ratio = getElementScrollRatio(previewScrollRef.current);
                if (ratio !== null) {
                    pendingScrollRatioRef.current = ratio;
                }
            }
            setMarkdownViewMode(next);
        },
        [markdownViewMode],
    );

    const handleDiffViewModeChange = useCallback((next: DiffViewMode) => {
        setDiffViewModeState(next);
        setDiffViewMode(next);
    }, []);

    useEffect(() => {
        setSelectionComment(null);
        setPendingComment(null);
    }, [selectedPath]);

    useEffect(() => {
        if (!keybindsEnabled) {
            setSelectionComment(null);
        }
    }, [keybindsEnabled]);

    const selectAdjacentFile = useCallback(
        (direction: 1 | -1) => {
            if (files.length === 0) return;
            const currentIndex = selectedPath ? files.findIndex((file) => file.path === selectedPath) : -1;
            const nextIndex =
                currentIndex === -1
                    ? direction === 1
                        ? 0
                        : files.length - 1
                    : (currentIndex + direction + files.length) % files.length;
            selectPath(files[nextIndex]?.path ?? null);
        },
        [files, selectedPath, selectPath],
    );

    const scrollCurrentFile = useCallback(
        (deltaPx: number) => {
            if (!selectedPath || deltaPx === 0) return;
            const showingPreview =
                isMarkdownPath(selectedPath) && markdownViewMode === 'preview' && Boolean(fileDiff && !fileDiff.binary);
            if (showingPreview) {
                setElementScrollBy(previewScrollRef.current, deltaPx);
                return;
            }
            setDiffEditorScrollBy(diffEditorRef.current, deltaPx);
        },
        [fileDiff, markdownViewMode, selectedPath],
    );

    const requestDiscard = useCallback((path: string) => {
        setPendingDiscardPath(path);
    }, []);

    const toggleReviewed = useCallback(
        (path: string) => {
            const file = files.find((entry) => entry.path === path);
            if (!file) return;
            updateReviewedFingerprints((prev) => {
                const next = new Map(prev);
                if (next.has(path)) {
                    next.delete(path);
                } else {
                    next.set(path, fileFingerprint(file));
                }
                return next;
            });
        },
        [files, updateReviewedFingerprints],
    );

    useKeybind('session', 'nextFile', () => selectAdjacentFile(1), {
        enabled: keybindsEnabled && files.length > 0,
    });
    useKeybind('session', 'previousFile', () => selectAdjacentFile(-1), {
        enabled: keybindsEnabled && files.length > 0,
    });
    useKeybind(
        'session',
        'discardFile',
        () => {
            if (selectedPath) requestDiscard(selectedPath);
        },
        { enabled: keybindsEnabled && Boolean(selectedPath) },
    );
    useKeybind(
        'session',
        'toggleMarkdownPreview',
        () => {
            if (!isMarkdownPath(selectedPath)) return;
            handleMarkdownViewModeChange(markdownViewMode === 'code' ? 'preview' : 'code');
        },
        { enabled: keybindsEnabled && Boolean(selectedPath) && isMarkdownPath(selectedPath) },
    );
    useKeybind(
        'session',
        'markFileReviewed',
        () => {
            if (!selectedPath) return;
            // Clear a leftover focus ring on the file name / reviewed checkbox when
            // toggling via "r" (keyboard modality otherwise makes it visible).
            const active = document.activeElement;
            if (
                active instanceof HTMLElement &&
                (fileListRef.current?.contains(active) || active === reviewedCheckboxRef.current)
            ) {
                active.blur();
            }
            toggleReviewed(selectedPath);
        },
        { enabled: keybindsEnabled && Boolean(selectedPath) },
    );
    useKeybind('session', 'commentSelection', openCommentDialog, {
        enabled: keybindsEnabled && Boolean(selectionComment) && !pendingComment,
    });
    useKeybind('session', 'diffViewSplit', () => handleDiffViewModeChange('split'), {
        enabled: keybindsEnabled,
    });
    useKeybind('session', 'diffViewNegative', () => handleDiffViewModeChange('negative'), {
        enabled: keybindsEnabled,
    });
    useKeybind('session', 'diffViewPositive', () => handleDiffViewModeChange('positive'), {
        enabled: keybindsEnabled,
    });

    useEffect(() => {
        if (!keybindsEnabled || !selectedPath) return;

        const upChord = keybinds.session.scrollFileUp.trim();
        const downChord = keybinds.session.scrollFileDown.trim();
        const speedModifierChord = keybinds.session.scrollSpeedModifier.trim();
        if (!upChord && !downChord) return;

        let direction: -1 | 0 | 1 = 0;
        let speedModifierHeld = false;
        let activeCode: string | null = null;
        let raf = 0;
        let lastTs = 0;

        function stop() {
            direction = 0;
            activeCode = null;
            lastTs = 0;
            if (raf) {
                cancelAnimationFrame(raf);
                raf = 0;
            }
        }

        function frame(ts: number) {
            if (direction === 0) {
                raf = 0;
                return;
            }
            if (lastTs === 0) {
                lastTs = ts;
                raf = requestAnimationFrame(frame);
                return;
            }
            const dt = Math.min(33, ts - lastTs);
            lastTs = ts;
            const speedScale = speedModifierHeld ? 2 : 1;
            scrollCurrentFile(direction * FILE_SCROLL_PX_PER_SEC * speedScale * (dt / 1000));
            raf = requestAnimationFrame(frame);
        }

        function start(next: -1 | 1, code: string) {
            if (direction === next && activeCode === code) return;
            direction = next;
            activeCode = code;
            lastTs = 0;
            if (!raf) {
                raf = requestAnimationFrame(frame);
            }
        }

        function onKeyDown(event: KeyboardEvent) {
            if (event.defaultPrevented) return;
            if (document.querySelector('[aria-modal="true"]')) return;
            if (isTerminalInsertTarget(event.target)) return;

            if (speedModifierChord && eventMatchesKeybind(event, speedModifierChord)) {
                speedModifierHeld = true;
            } else if (speedModifierChord) {
                speedModifierHeld = modifierChordHeld(event, speedModifierChord);
            }

            if (upChord && eventMatchesKeybind(event, upChord, { ignoreModifiersFrom: speedModifierChord })) {
                event.preventDefault();
                event.stopPropagation();
                if (!event.repeat) start(-1, event.code);
                return;
            }
            if (downChord && eventMatchesKeybind(event, downChord, { ignoreModifiersFrom: speedModifierChord })) {
                event.preventDefault();
                event.stopPropagation();
                if (!event.repeat) start(1, event.code);
            }
        }

        function onKeyUp(event: KeyboardEvent) {
            if (speedModifierChord && eventMatchesKeybind(event, speedModifierChord)) {
                speedModifierHeld = false;
            } else if (speedModifierChord) {
                speedModifierHeld = modifierChordHeld(event, speedModifierChord);
            }

            if (activeCode && event.code === activeCode) {
                stop();
                return;
            }
            if (upChord && eventMatchesKeybind(event, upChord) && direction === -1) {
                stop();
                return;
            }
            if (downChord && eventMatchesKeybind(event, downChord) && direction === 1) {
                stop();
            }
        }

        function onWindowBlur() {
            speedModifierHeld = false;
            stop();
        }

        window.addEventListener('keydown', onKeyDown, true);
        window.addEventListener('keyup', onKeyUp, true);
        window.addEventListener('blur', onWindowBlur);
        return () => {
            stop();
            window.removeEventListener('keydown', onKeyDown, true);
            window.removeEventListener('keyup', onKeyUp, true);
            window.removeEventListener('blur', onWindowBlur);
        };
    }, [
        keybinds.session.scrollFileDown,
        keybinds.session.scrollFileUp,
        keybinds.session.scrollSpeedModifier,
        keybindsEnabled,
        scrollCurrentFile,
        selectedPath,
    ]);

    useLayoutEffect(() => {
        const ratio = pendingScrollRatioRef.current;
        if (ratio === null) {
            return;
        }
        pendingScrollRatioRef.current = null;
        scrollRatioRef.current = ratio;
        schedulePersistScroll();
        const target = markdownViewMode === 'preview' ? 'preview' : 'code';
        const refs = { diffEditor: diffEditorRef.current, preview: previewScrollRef.current };
        restoringScrollRef.current = true;
        applyScrollRatio(target, ratio, refs);
        requestAnimationFrame(() => {
            applyScrollRatio(target, ratio, refs);
            restoringScrollRef.current = false;
        });
    }, [markdownViewMode, schedulePersistScroll]);

    const wasPaneActiveRef = useRef(keybindsEnabled);
    // Restore scroll when the desktop pane returns from `display:none`.
    useLayoutEffect(() => {
        const becameActive = !wasPaneActiveRef.current && keybindsEnabled;
        wasPaneActiveRef.current = keybindsEnabled;
        if (becameActive) {
            restoreScrollPosition();
        }
    }, [keybindsEnabled, restoreScrollPosition]);

    useEffect(() => {
        if (!keybindsEnabled || !showingMarkdownPreview) {
            return;
        }
        const element = previewScrollRef.current;
        if (!element) {
            return;
        }
        const onScroll = () => {
            rememberScrollRatio(getElementScrollRatio(element));
        };
        element.addEventListener('scroll', onScroll, { passive: true });
        return () => element.removeEventListener('scroll', onScroll);
    }, [keybindsEnabled, showingMarkdownPreview, fileDiff, rememberScrollRatio]);

    const isAddedFile = fileDiff?.status === 'added';
    const editorContents = useMemo(() => {
        if (!fileDiff || fileDiff.binary) {
            return { original: '', modified: '' };
        }
        return applyDiffViewMode(fileDiff.original, fileDiff.modified, diffViewMode);
    }, [fileDiff, diffViewMode]);
    const diffEditorOptions = useMemo(
        () => ({
            readOnly: true,
            // Split shows both sides; filtered modes stay unified so only +/- hunks read clearly.
            renderSideBySide: isDesktop && diffViewMode === 'split',
            useInlineViewWhenSpaceIsLimited: false,
            // Monaco clamps splitViewDefaultRatio to [0.1, 0.9]; use the floor so added
            // files devote almost all width to the new content (original pane is empty).
            splitViewDefaultRatio: isDesktop && diffViewMode === 'split' && isAddedFile ? 0.1 : 0.5,
            wordWrap: 'on' as const,
            wrappingIndent: 'same' as const,
            fontSize: isDesktop ? 13 : 11,
            lineHeight: isDesktop ? 18 : 16,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            renderOverviewRuler: true,
            overviewRulerLanes: 0,
            scrollbar: {
                verticalScrollbarSize: 10,
                horizontalScrollbarSize: 10,
                useShadows: false,
                verticalHasArrows: false,
                horizontalHasArrows: false,
                arrowSize: 0,
            },
            padding: { top: 8, bottom: 8 },
            glyphMargin: false,
            folding: false,
            lineDecorationsWidth: 8,
            lineNumbersMinChars: 3,
            renderLineHighlight: 'none' as const,
            contextmenu: false,
            automaticLayout: true,
            originalEditable: false,
        }),
        [isDesktop, isAddedFile, diffViewMode],
    );

    // Reset content fingerprint when the selected path changes so a stale fileDiff
    // from the previous file cannot clear the new file's reviewed state.
    useEffect(() => {
        fileContentFingerprintRef.current = null;
    }, [selectedPath]);

    // Clear reviewed when the open file's contents change after it was marked.
    useEffect(() => {
        if (!fileDiff || fileDiff.path !== selectedPathRef.current) {
            return;
        }
        const nextFingerprint = fileContentFingerprint(fileDiff);
        const prevFingerprint = fileContentFingerprintRef.current;
        if (prevFingerprint !== null && prevFingerprint !== nextFingerprint) {
            const path = fileDiff.path;
            updateReviewedFingerprints((reviewed) => {
                if (!reviewed.has(path)) return reviewed;
                const next = new Map(reviewed);
                next.delete(path);
                return next;
            });
        }
        fileContentFingerprintRef.current = nextFingerprint;
    }, [fileDiff, updateReviewedFingerprints]);

    // Refresh the open file when the workspace reports a diff change.
    useEffect(() => {
        if (!selectedPath || diffGeneration === 0) return;

        const abort = new AbortController();
        const path = selectedPath;
        getSessionDiffFile(sessionId, path, { signal: abort.signal })
            .then((file) => {
                if (abort.signal.aborted) return;
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
            .catch((err: unknown) => {
                if (abort.signal.aborted) return;
                // File left the review diff (e.g. discarded); drop stale selection/content.
                if (err instanceof ApiError && err.message === 'File not found in diff') {
                    if (selectedPathRef.current === path) {
                        selectPath(null);
                    }
                }
                // Other errors: best-effort refresh; keep the last good diff.
            });

        return () => {
            abort.abort();
        };
    }, [sessionId, selectedPath, selectPath, diffGeneration]);

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

    function collapseAllFolders() {
        setCollapsedPaths(new Set(dirPaths));
    }

    function resetReviews() {
        updateReviewedFingerprints((prev) => (prev.size === 0 ? prev : new Map()));
    }

    async function confirmDiscard() {
        const path = pendingDiscardPath;
        if (!path || discarding) return;

        setDiscarding(true);
        try {
            await discardSessionDiffFile(sessionId, path);
            // Drop any in-flight request that may still carry a pre-discard file list.
            diffFilesRequestIdRef.current += 1;
            bumpDiffGeneration(sessionId);
            const state = await ensureSessionDiff(sessionId, getDiffGeneration(sessionId));
            // Force apply even if the signature somehow matches the previous list.
            filesSignatureRef.current = '';
            applyDiffFiles(state.summary?.files ?? []);
            setPendingDiscardPath(null);
        } catch (err: unknown) {
            showToast('generic-error', err instanceof Error ? err.message : intl.formatMessage(messages.discardFailed));
        } finally {
            setDiscarding(false);
        }
    }

    const listLoading = loading && files.length === 0;
    const editorEmptyMessage = !hasFiles ? intl.formatMessage(messages.empty) : intl.formatMessage(messages.selectFile);

    const showEditor = isDesktop || Boolean(selectedPath);
    const listPanelWrapClass = !isDesktop && selectedPath ? styles.listPanelWrapMobileHidden : styles.listPanelWrap;
    const listPanelClass = selectedPath ? styles.listPanelMobileHidden : styles.listPanel;
    const editorPanelClass = showEditor ? styles.editorPanel : styles.editorPanelMobileHidden;
    const showMarkdownToggle = isMarkdownPath(selectedPath);
    const showMarkdownPreview = showingMarkdownPreview;
    const commentButton =
        selectionComment && !pendingComment && !showMarkdownPreview ? (
            <button
                type='button'
                className={`${styles.commentButton}${selectionComment.placeAbove ? ` ${styles.commentButtonAbove}` : ''}`}
                style={{ top: selectionComment.top, left: selectionComment.left }}
                onMouseDown={(event) => {
                    // Keep the Monaco selection when clicking the overlay button.
                    event.preventDefault();
                }}
                onClick={openCommentDialog}
            >
                {intl.formatMessage(messages.commentSelection)}
            </button>
        ) : null;

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
                        {reviewedFingerprints.size > 0 ? (
                            <button
                                type='button'
                                className={styles.collapseAllButton}
                                title={intl.formatMessage(messages.resetReviews)}
                                aria-label={intl.formatMessage(messages.resetReviews)}
                                onClick={resetReviews}
                            >
                                <ResetReviewsIcon />
                            </button>
                        ) : null}
                        {dirPaths.length > 0 ? (
                            <button
                                type='button'
                                className={styles.collapseAllButton}
                                title={intl.formatMessage(messages.collapseAllFolders)}
                                aria-label={intl.formatMessage(messages.collapseAllFolders)}
                                onClick={collapseAllFolders}
                            >
                                <CollapseAllFoldersIcon />
                            </button>
                        ) : null}
                    </div>
                    {listLoading ? (
                        <Spinner label={loadingLabel} />
                    ) : files.length === 0 ? (
                        <p className={styles.centered}>{intl.formatMessage(messages.empty)}</p>
                    ) : (
                        <div ref={fileListRef} className={styles.fileList}>
                            <FileTree
                                nodes={tree}
                                depth={0}
                                selectedPath={selectedPath}
                                reviewedPaths={reviewedFingerprints}
                                collapsedPaths={collapsedPaths}
                                onToggle={toggleFolder}
                                onSelect={selectPath}
                                onDiscard={requestDiscard}
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
                            <button
                                type='button'
                                className={styles.backButton}
                                title={intl.formatMessage(messages.backToFiles)}
                                aria-label={intl.formatMessage(messages.backToFiles)}
                                onClick={() => selectPath(null)}
                            >
                                <BackIcon />
                            </button>
                            <span className={styles.fileHeaderPath} title={selectedPath}>
                                {selectedPath}
                            </span>
                            {showMarkdownToggle ? (
                                <button
                                    type='button'
                                    className={styles.fileHeaderMode}
                                    title={intl.formatMessage(
                                        markdownViewMode === 'code'
                                            ? messages.showMarkdownPreview
                                            : messages.showCodeView,
                                    )}
                                    aria-label={intl.formatMessage(
                                        markdownViewMode === 'code'
                                            ? messages.showMarkdownPreview
                                            : messages.showCodeView,
                                    )}
                                    onClick={() =>
                                        handleMarkdownViewModeChange(markdownViewMode === 'code' ? 'preview' : 'code')
                                    }
                                >
                                    {markdownViewMode === 'code' ? (
                                        <MarkdownPreviewViewIcon />
                                    ) : (
                                        <MarkdownCodeViewIcon />
                                    )}
                                </button>
                            ) : null}
                            {onToggleFullscreen ? (
                                <button
                                    type='button'
                                    className={`${styles.fileHeaderMode}${fullscreen ? ` ${styles.diffViewModeButtonActive}` : ''}`}
                                    title={intl.formatMessage(
                                        fullscreen ? messages.exitFullscreen : messages.enterFullscreen,
                                    )}
                                    aria-label={intl.formatMessage(
                                        fullscreen ? messages.exitFullscreen : messages.enterFullscreen,
                                    )}
                                    aria-pressed={fullscreen}
                                    onClick={onToggleFullscreen}
                                >
                                    {fullscreen ? <ExitFullscreenIcon /> : <FullscreenIcon />}
                                </button>
                            ) : null}
                            <DiffViewModeControls mode={diffViewMode} onChange={handleDiffViewModeChange} />
                            <label
                                className={styles.reviewedToggle}
                                onMouseDown={(event) => {
                                    // Don't steal focus into the header checkbox (next to the
                                    // file name) when toggling reviewed with the mouse.
                                    event.preventDefault();
                                }}
                            >
                                <input
                                    ref={reviewedCheckboxRef}
                                    type='checkbox'
                                    className={styles.reviewedCheckbox}
                                    checked={reviewedFingerprints.has(selectedPath)}
                                    onChange={() => toggleReviewed(selectedPath)}
                                />
                                {intl.formatMessage(messages.reviewed)}
                            </label>
                        </div>
                        {fileLoading || !fileDiff ? (
                            <Spinner label={loadingLabel} />
                        ) : fileDiff.binary ? (
                            <p className={styles.centered}>{intl.formatMessage(messages.binaryFile)}</p>
                        ) : showMarkdownToggle ? (
                            <div className={styles.markdownViewPane}>
                                <div
                                    ref={editorWrapRef}
                                    className={`${styles.editorWrap}${showMarkdownPreview ? ` ${styles.markdownViewHidden}` : ''}`}
                                >
                                    <div className={styles.editorFill}>
                                        <SessionDiffEditor
                                            original={editorContents.original}
                                            modified={editorContents.modified}
                                            language={fileDiff.language}
                                            options={diffEditorOptions}
                                            onMount={handleDiffEditorMount}
                                            onUnmount={handleDiffEditorUnmount}
                                        />
                                    </div>
                                    {commentButton}
                                </div>
                                <Suspense fallback={null}>
                                    <MarkdownPreview
                                        ref={previewScrollRef}
                                        className={`${styles.markdownPreview}${showMarkdownPreview ? '' : ` ${styles.markdownViewHidden}`}`}
                                        content={markdownPreviewContent(fileDiff)}
                                    />
                                </Suspense>{' '}
                            </div>
                        ) : (
                            <div ref={editorWrapRef} className={styles.editorWrap}>
                                <div className={styles.editorFill}>
                                    <SessionDiffEditor
                                        original={editorContents.original}
                                        modified={editorContents.modified}
                                        language={fileDiff.language}
                                        options={diffEditorOptions}
                                        onMount={handleDiffEditorMount}
                                        onUnmount={handleDiffEditorUnmount}
                                    />
                                </div>
                                {commentButton}
                            </div>
                        )}
                    </>
                ) : listLoading ? (
                    <Spinner label={loadingLabel} />
                ) : (
                    <p className={styles.centered}>{editorEmptyMessage}</p>
                )}
            </div>
            {pendingDiscardPath ? (
                <ConfirmDialog
                    message={intl.formatMessage(messages.discardConfirm, { path: pendingDiscardPath })}
                    cancelLabel={intl.formatMessage(messages.discardConfirmCancel)}
                    confirmLabel={intl.formatMessage(messages.discardConfirmContinue)}
                    busy={discarding}
                    onCancel={() => {
                        if (!discarding) setPendingDiscardPath(null);
                    }}
                    onConfirm={() => {
                        void confirmDiscard();
                    }}
                />
            ) : null}
            {pendingComment ? (
                <CommentDialog
                    fileName={pendingComment.fileName}
                    startLine={pendingComment.startLine}
                    endLine={pendingComment.endLine}
                    onCancel={closeCommentDialog}
                    onConfirm={submitComment}
                />
            ) : null}
        </div>
    );
}
