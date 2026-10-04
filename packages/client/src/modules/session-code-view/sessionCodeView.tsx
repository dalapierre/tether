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
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { messages } from './sessionCodeView.messages';
import { styles } from './sessionCodeView.styles';
import type { SessionCodeViewProps } from './sessionCodeView.types';

setupMonaco();

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

function FileRow({ file, onSelect }: { file: SessionDiffFile; onSelect: (path: string) => void }) {
    const intl = useIntl();
    const fileName = file.path.includes('/') ? file.path.slice(file.path.lastIndexOf('/') + 1) : file.path;
    const dir = file.path.includes('/') ? file.path.slice(0, file.path.lastIndexOf('/')) : '';

    return (
        <button type='button' className={styles.fileButton} onClick={() => onSelect(file.path)}>
            <span className={`${styles.statusBadge} ${statusClass(file.status)}`}>
                {statusLabel(file.status, intl.formatMessage)}
            </span>
            <span className={styles.fileMeta}>
                <span className={styles.filePath}>{fileName}</span>
                {file.oldPath ? (
                    <span className={styles.fileSubpath}>
                        {file.oldPath} → {file.path}
                    </span>
                ) : dir ? (
                    <span className={styles.fileSubpath}>{dir}</span>
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

export function SessionCodeView({ sessionId }: SessionCodeViewProps) {
    const intl = useIntl();
    const [files, setFiles] = useState<SessionDiffFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPath, setSelectedPath] = useState<string | null>(null);
    const [fileDiff, setFileDiff] = useState<SessionFileDiff | null>(null);
    const [fileLoading, setFileLoading] = useState(false);

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

    if (selectedPath) {
        return (
            <div className={styles.root}>
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
        );
    }

    return (
        <div className={styles.root}>
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
                    {files.map((file) => (
                        <FileRow key={file.path} file={file} onSelect={setSelectedPath} />
                    ))}
                </div>
            )}
        </div>
    );
}
