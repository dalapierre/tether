import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from 'react';
import { styles } from './swipeToDelete.styles';
import type { SwipeToDeleteProps } from './swipeToDelete.types';

const DELETE_WIDTH = 88;
const OPEN_THRESHOLD = 40;
const CLICK_SLOP = 8;

export function SwipeToDelete({
    children,
    deleteLabel,
    onDelete,
    disabled = false,
    open,
    onOpenChange,
}: SwipeToDeleteProps) {
    const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
    const [offset, setOffset] = useState(0);
    const [dragging, setDragging] = useState(false);
    const offsetRef = useRef(0);
    const startXRef = useRef(0);
    const startYRef = useRef(0);
    const startOffsetRef = useRef(0);
    const axisRef = useRef<'undecided' | 'horizontal' | 'vertical'>('undecided');
    const movedRef = useRef(false);
    const activePointerRef = useRef<number | null>(null);

    const revealed = open ?? uncontrolledOpen;

    function updateOffset(next: number) {
        offsetRef.current = next;
        setOffset(next);
    }

    function setRevealed(next: boolean) {
        if (open === undefined) {
            setUncontrolledOpen(next);
        }
        onOpenChange?.(next);
        updateOffset(next ? -DELETE_WIDTH : 0);
    }

    useEffect(() => {
        if (!dragging) {
            updateOffset(revealed ? -DELETE_WIDTH : 0);
        }
    }, [revealed, dragging]);

    function settle(nextOffset: number) {
        const shouldOpen = nextOffset <= -OPEN_THRESHOLD;
        setDragging(false);
        setRevealed(shouldOpen);
    }

    function onPointerDown(event: PointerEvent<HTMLDivElement>) {
        if (disabled || event.button !== 0) return;
        activePointerRef.current = event.pointerId;
        startXRef.current = event.clientX;
        startYRef.current = event.clientY;
        startOffsetRef.current = revealed ? -DELETE_WIDTH : 0;
        axisRef.current = 'undecided';
        movedRef.current = false;
        // Capture only after a horizontal swipe is confirmed — capturing on
        // pointerdown retargets click to this panel and blocks child onClick.
    }

    function onPointerMove(event: PointerEvent<HTMLDivElement>) {
        if (disabled || activePointerRef.current !== event.pointerId) return;

        const dx = event.clientX - startXRef.current;
        const dy = event.clientY - startYRef.current;

        if (axisRef.current === 'undecided') {
            if (Math.abs(dx) < CLICK_SLOP && Math.abs(dy) < CLICK_SLOP) {
                return;
            }
            axisRef.current = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical';
            if (axisRef.current === 'vertical') {
                activePointerRef.current = null;
                return;
            }
            setDragging(true);
            event.currentTarget.setPointerCapture(event.pointerId);
        }

        if (axisRef.current !== 'horizontal') return;

        movedRef.current = true;
        updateOffset(Math.min(0, Math.max(-DELETE_WIDTH, startOffsetRef.current + dx)));
    }

    function onPointerUp(event: PointerEvent<HTMLDivElement>) {
        if (activePointerRef.current !== event.pointerId) return;
        activePointerRef.current = null;

        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            try {
                event.currentTarget.releasePointerCapture(event.pointerId);
            } catch {
                // ignore
            }
        }

        if (axisRef.current === 'horizontal' && movedRef.current) {
            settle(offsetRef.current);
            return;
        }

        setDragging(false);
    }

    function handlePanelClickCapture(event: MouseEvent<HTMLDivElement>) {
        if (movedRef.current || revealed) {
            event.preventDefault();
            event.stopPropagation();
            if (revealed && !movedRef.current) {
                setRevealed(false);
            }
            movedRef.current = false;
        }
    }

    return (
        <div className={styles.root}>
            <div className={styles.actions} aria-hidden={!revealed}>
                <button
                    type='button'
                    className={styles.deleteButton}
                    style={{ width: DELETE_WIDTH }}
                    disabled={disabled}
                    tabIndex={revealed ? 0 : -1}
                    onClick={() => {
                        setRevealed(false);
                        onDelete();
                    }}
                >
                    {deleteLabel}
                </button>
            </div>
            <div
                className={`${styles.panel} ${dragging ? styles.panelDragging : styles.panelSettling}`}
                style={{ transform: `translate3d(${offset}px, 0, 0)` }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                onClickCapture={handlePanelClickCapture}
            >
                {children}
            </div>
        </div>
    );
}
