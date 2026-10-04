import { Button } from '@client/components/button';
import { useEffect, useRef } from 'react';
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
    const panelRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        function onKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape' && !busy) {
                onCancel();
            }
        }

        window.addEventListener('keydown', onKeyDown);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [busy, onCancel]);

    useEffect(() => {
        panelRef.current?.focus();
    }, []);

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
            <div
                ref={panelRef}
                className={styles.panel}
                role='alertdialog'
                aria-modal='true'
                aria-label={ariaLabel ?? message}
                tabIndex={-1}
            >
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
