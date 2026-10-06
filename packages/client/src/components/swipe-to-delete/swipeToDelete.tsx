import { useRef, useState, type MouseEvent, type PointerEvent } from 'react';
import { styles } from './swipeToDelete.styles';
import type { SwipeToDeleteProps } from './swipeToDelete.types';

const DISMISS_THRESHOLD = 80;
const CLICK_SLOP = 8;

export function SwipeToDelete({ children, onDelete, disabled = false }: SwipeToDeleteProps) {
    const [offset, setOffset] = useState(0);
    const [dragging, setDragging] = useState(false);
    const offsetRef = useRef(0);
    const startXRef = useRef(0);
    const startYRef = useRef(0);
    const axisRef = useRef<'undecided' | 'horizontal' | 'vertical'>('undecided');
    const movedRef = useRef(false);
    const activePointerRef = useRef<number | null>(null);

    function updateOffset(next: number) {
        offsetRef.current = next;
        setOffset(next);
    }

    function settle() {
        const shouldDelete = offsetRef.current <= -DISMISS_THRESHOLD;
        setDragging(false);
        updateOffset(0);

        if (shouldDelete) {
            onDelete();
        }
    }

    function onPointerDown(event: PointerEvent<HTMLDivElement>) {
        if (disabled || event.button !== 0) return;
        activePointerRef.current = event.pointerId;
        startXRef.current = event.clientX;
        startYRef.current = event.clientY;
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
        updateOffset(Math.min(0, dx));
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
            settle();
            return;
        }

        setDragging(false);
    }

    function onPointerCancel(event: PointerEvent<HTMLDivElement>) {
        if (activePointerRef.current !== event.pointerId) return;
        activePointerRef.current = null;

        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            try {
                event.currentTarget.releasePointerCapture(event.pointerId);
            } catch {
                // ignore
            }
        }

        setDragging(false);
        updateOffset(0);
    }

    function handlePanelClickCapture(event: MouseEvent<HTMLDivElement>) {
        if (movedRef.current) {
            event.preventDefault();
            event.stopPropagation();
            movedRef.current = false;
        }
    }

    const opacity = Math.max(0.35, 1 + offset / 180);

    return (
        <div className={`${styles.root} ${dragging || offset !== 0 ? styles.rootClipping : ''}`}>
            <div
                className={`${styles.panel} ${dragging ? styles.panelDragging : styles.panelSettling}`}
                style={{ transform: `translate3d(${offset}px, 0, 0)`, opacity }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerCancel}
                onClickCapture={handlePanelClickCapture}
            >
                {children}
            </div>
        </div>
    );
}
