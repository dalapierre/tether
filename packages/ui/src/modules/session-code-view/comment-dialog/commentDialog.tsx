import { Button } from '@ui/components/button';
import { useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { messages } from './commentDialog.messages';
import { styles } from './commentDialog.styles';
import type { CommentDialogProps } from './commentDialog.types';

export function CommentDialog({ fileName, startLine, endLine, onCancel, onConfirm }: CommentDialogProps) {
    const intl = useIntl();
    const inputRef = useRef<HTMLTextAreaElement | null>(null);
    const [value, setValue] = useState('');
    const trimmed = value.trim();
    const canConfirm = trimmed.length > 0;
    const lineLabel =
        startLine === endLine
            ? intl.formatMessage(messages.lineSingle, { line: startLine })
            : intl.formatMessage(messages.lineRange, { start: startLine, end: endLine });

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    useEffect(() => {
        function onKeyDown(event: KeyboardEvent) {
            if (event.defaultPrevented || event.repeat) return;
            if (event.altKey || event.ctrlKey || event.metaKey) return;

            if (event.key === 'Escape') {
                event.preventDefault();
                onCancel();
                return;
            }

            if (event.key === 'Enter' && !event.shiftKey) {
                if (!canConfirm) return;
                event.preventDefault();
                onConfirm(trimmed);
            }
        }

        window.addEventListener('keydown', onKeyDown);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [canConfirm, onCancel, onConfirm, trimmed]);

    return (
        <div
            className={styles.backdrop}
            role='presentation'
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                    onCancel();
                }
            }}
        >
            <div
                className={styles.panel}
                role='dialog'
                aria-modal='true'
                aria-label={intl.formatMessage(messages.title)}
            >
                <p className={styles.title}>{intl.formatMessage(messages.title)}</p>
                <p className={styles.fileName}>{fileName}</p>
                <p className={styles.lineRange}>{lineLabel}</p>
                <textarea
                    ref={inputRef}
                    className={styles.input}
                    rows={6}
                    value={value}
                    placeholder={intl.formatMessage(messages.placeholder)}
                    autoCapitalize='off'
                    autoCorrect='off'
                    spellCheck={false}
                    onChange={(event) => setValue(event.target.value)}
                />
                <div className={styles.actions}>
                    <Button type='button' variant='secondary' onClick={onCancel}>
                        {intl.formatMessage(messages.cancel)}
                    </Button>
                    <Button
                        type='button'
                        disabled={!canConfirm}
                        onClick={() => {
                            if (!canConfirm) return;
                            onConfirm(trimmed);
                        }}
                    >
                        {intl.formatMessage(messages.confirm)}
                    </Button>
                </div>
            </div>
        </div>
    );
}
