import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { styles } from './panelResizeHandle.styles';
import type { PanelResizeHandleProps } from './panelResizeHandle.types';

export function PanelResizeHandle({ ariaLabel, edge, onResize, onResizeEnd, className }: PanelResizeHandleProps) {
    const [dragging, setDragging] = useState(false);
    const lastXRef = useRef(0);

    function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
        if (event.button !== 0) {
            return;
        }

        event.preventDefault();
        lastXRef.current = event.clientX;
        setDragging(true);
        event.currentTarget.setPointerCapture(event.pointerId);
    }

    function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
        if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
            return;
        }

        const delta = event.clientX - lastXRef.current;
        lastXRef.current = event.clientX;
        if (delta !== 0) {
            onResize(delta);
        }
    }

    function endDrag(event: ReactPointerEvent<HTMLDivElement>) {
        if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
            return;
        }

        try {
            event.currentTarget.releasePointerCapture(event.pointerId);
        } catch {
            // ignore
        }

        setDragging(false);
        onResizeEnd?.();
    }

    const edgeClass = edge === 'leading' ? styles.leading : styles.trailing;

    return (
        <div
            role='separator'
            aria-orientation='vertical'
            aria-label={ariaLabel}
            className={`${styles.root} ${edgeClass}${dragging ? ' bg-zinc-600' : ''}${className ? ` ${className}` : ''}`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onLostPointerCapture={() => setDragging(false)}
        />
    );
}
