import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { styles } from './panelResizeHandle.styles';
import type { PanelResizeHandleProps } from './panelResizeHandle.types';

export function PanelResizeHandle({
    ariaLabel,
    orientation = 'horizontal',
    placement = 'edge',
    edge,
    onResize,
    onResizeEnd,
    className,
}: PanelResizeHandleProps) {
    const [dragging, setDragging] = useState(false);
    const lastPosRef = useRef(0);
    const vertical = orientation === 'vertical';
    const gap = placement === 'gap';

    function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
        if (event.button !== 0) {
            return;
        }

        event.preventDefault();
        lastPosRef.current = vertical ? event.clientY : event.clientX;
        setDragging(true);
        event.currentTarget.setPointerCapture(event.pointerId);
    }

    function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
        if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
            return;
        }

        const pos = vertical ? event.clientY : event.clientX;
        const delta = pos - lastPosRef.current;
        lastPosRef.current = pos;
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

    let rootClass: string;
    if (gap) {
        rootClass = vertical ? styles.gapVertical : styles.gapHorizontal;
    } else {
        const edgeClass = vertical
            ? edge === 'trailing'
                ? styles.trailingVertical
                : styles.leadingVertical
            : edge === 'trailing'
              ? styles.trailingHorizontal
              : styles.leadingHorizontal;
        rootClass = `${vertical ? styles.rootVertical : styles.rootHorizontal} ${edgeClass}`;
    }

    return (
        <div
            role='separator'
            aria-orientation={vertical ? 'horizontal' : 'vertical'}
            aria-label={ariaLabel}
            className={`${rootClass}${dragging ? ' bg-zinc-600' : ''}${className ? ` ${className}` : ''}`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onLostPointerCapture={() => setDragging(false)}
        />
    );
}
