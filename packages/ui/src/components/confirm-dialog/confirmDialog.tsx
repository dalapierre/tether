import { Button } from '@ui/components/button';
import { useEffect } from 'react';
import { styles } from './confirmDialog.styles';
import type { ConfirmDialogProps } from './confirmDialog.types';

export function ConfirmDialog({
    message,
    cancelLabel,
    confirmLabel,
    onCancel,
    onConfirm,
    busy = false,
    ariaLabel,
}: ConfirmDialogProps) {
    useEffect(() => {
        function onKeyDown(event: KeyboardEvent) {
            if (busy || event.defaultPrevented || event.repeat) return;
            if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;

            if (event.key === 'Escape') {
                event.preventDefault();
                onCancel();
                return;
            }

            if (event.key === 'Enter') {
                event.preventDefault();
                onConfirm();
            }
        }

        window.addEventListener('keydown', onKeyDown);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [busy, onCancel, onConfirm]);

    return (
        <div
            className={styles.backdrop}
            role='presentation'
            onMouseDown={(event) => {
                if (busy) return;
                if (event.target === event.currentTarget) {
                    onCancel();
                }
            }}
        >
            <div className={styles.panel} role='alertdialog' aria-modal='true' aria-label={ariaLabel ?? message}>
                <p className={styles.message}>{message}</p>
                <div className={styles.actions}>
                    <Button type='button' onClick={onConfirm} disabled={busy}>
                        {confirmLabel}
                    </Button>
                    <Button type='button' variant='secondary' onClick={onCancel} disabled={busy}>
                        {cancelLabel}
                    </Button>
                </div>
            </div>
        </div>
    );
}
