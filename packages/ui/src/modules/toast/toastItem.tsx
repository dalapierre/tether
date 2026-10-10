import { useRef, useState, type PointerEvent as ReactPointerEvent, type TransitionEvent } from 'react';
import { useIntl } from 'react-intl';
import { messages } from './toast.messages';
import { styles } from './toast.styles';
import type { ActiveToast } from './toast.types';
import { dismissToast } from './toastStore';
import type { ToastType } from './toasts';

const SWIPE_DISMISS_DISTANCE_PX = 80;

function toastSurfaceClass(type: ToastType): string {
    if (type === 'error') return `${styles.toast} ${styles.toastError}`;
    if (type === 'success') return `${styles.toast} ${styles.toastSuccess}`;
    return `${styles.toast} ${styles.toastInfo}`;
}

type ToastItemProps = {
    toast: ActiveToast;
};

export function ToastItem({ toast }: ToastItemProps) {
    const intl = useIntl();
    const isError = toast.type === 'error';
    const [offsetX, setOffsetX] = useState(0);
    const [dragging, setDragging] = useState(false);
    const [exiting, setExiting] = useState(false);
    const startXRef = useRef<number | null>(null);
    const startYRef = useRef<number | null>(null);
    const axisLockedRef = useRef<'horizontal' | 'vertical' | null>(null);
    const offsetRef = useRef(0);

    function resetGesture() {
        startXRef.current = null;
        startYRef.current = null;
        axisLockedRef.current = null;
        setDragging(false);
    }

    function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
        if (exiting) return;
        if ((event.target as HTMLElement).closest('button')) return;

        startXRef.current = event.clientX;
        startYRef.current = event.clientY;
        axisLockedRef.current = null;
        offsetRef.current = 0;
        setDragging(true);
        event.currentTarget.setPointerCapture(event.pointerId);
    }

    function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
        if (startXRef.current === null || startYRef.current === null || exiting) return;

        const deltaX = event.clientX - startXRef.current;
        const deltaY = event.clientY - startYRef.current;

        if (axisLockedRef.current === null) {
            if (Math.abs(deltaX) < 6 && Math.abs(deltaY) < 6) return;
            axisLockedRef.current = Math.abs(deltaX) >= Math.abs(deltaY) ? 'horizontal' : 'vertical';
            if (axisLockedRef.current === 'vertical') {
                resetGesture();
                return;
            }
        }

        if (axisLockedRef.current !== 'horizontal') return;

        const next = Math.min(0, deltaX);
        offsetRef.current = next;
        setOffsetX(next);
    }

    function finishSwipe() {
        if (startXRef.current === null) return;

        const shouldDismiss = offsetRef.current <= -SWIPE_DISMISS_DISTANCE_PX;
        resetGesture();

        if (shouldDismiss) {
            setExiting(true);
            setOffsetX(-Math.max(window.innerWidth, 400));
            return;
        }

        setOffsetX(0);
    }

    function onPointerUp() {
        finishSwipe();
    }

    function onPointerCancel() {
        resetGesture();
        setOffsetX(0);
    }

    function onTransitionEnd(event: TransitionEvent<HTMLDivElement>) {
        if (event.propertyName !== 'transform' || !exiting) return;
        dismissToast(toast.instanceId);
    }

    const opacity = exiting ? 0 : Math.max(0.35, 1 + offsetX / 180);

    return (
        <div className={styles.item}>
            <div
                className={toastSurfaceClass(toast.type)}
                role={isError ? 'alert' : 'status'}
                style={{
                    transform: `translateX(${offsetX}px)`,
                    opacity,
                    transition: dragging ? 'none' : 'transform 180ms ease-out, opacity 180ms ease-out',
                }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerCancel}
                onTransitionEnd={onTransitionEnd}
            >
                {toast.type === 'success' ? <div className={styles.successBar} aria-hidden='true' /> : null}
                <div className={styles.content}>
                    <p className={isError ? styles.titleError : styles.title}>
                        {intl.formatMessage(toast.title, toast.values)}
                    </p>
                    <p className={isError ? styles.messageError : styles.message}>
                        {intl.formatMessage(toast.message, toast.values)}
                    </p>
                </div>
                <button
                    type='button'
                    className={isError ? styles.dismissError : styles.dismiss}
                    aria-label={intl.formatMessage(messages.dismiss)}
                    onClick={() => dismissToast(toast.instanceId)}
                >
                    ×
                </button>
            </div>
        </div>
    );
}
