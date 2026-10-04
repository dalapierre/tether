import type { Terminal } from '@xterm/xterm';

/** Ignore tiny movements so taps still focus the terminal / open the keyboard. */
const TAP_SLOP_PX = 8;

/**
 * xterm.js v6 no longer scrolls scrollback on touch-drag. Translate one-finger
 * vertical drags into scrollLines() so phones can scrub history.
 */
export function attachTouchScroll(host: HTMLElement, term: Terminal): () => void {
    let tracking = false;
    let scrolling = false;
    let startY = 0;
    let lastY = 0;
    let carryPx = 0;

    function rowHeight(): number {
        const rowsEl = host.querySelector('.xterm-rows');
        if (rowsEl instanceof HTMLElement && term.rows > 0) {
            const height = rowsEl.getBoundingClientRect().height / term.rows;
            if (height > 0) return height;
        }
        return Math.max(12, (term.options.fontSize ?? 13) * 1.2);
    }

    function onTouchStart(event: TouchEvent): void {
        if (event.touches.length !== 1) {
            tracking = false;
            scrolling = false;
            return;
        }
        tracking = true;
        scrolling = false;
        startY = event.touches[0]!.clientY;
        lastY = startY;
        carryPx = 0;
    }

    function onTouchMove(event: TouchEvent): void {
        if (!tracking || event.touches.length !== 1) return;

        const y = event.touches[0]!.clientY;
        if (!scrolling) {
            if (Math.abs(y - startY) < TAP_SLOP_PX) return;
            scrolling = true;
        }

        event.preventDefault();
        event.stopPropagation();

        carryPx += y - lastY;
        lastY = y;

        const linePx = rowHeight();
        const lines = Math.trunc(carryPx / linePx);
        if (lines === 0) return;

        // Finger down (positive dy) reveals older scrollback → scrollLines(negative).
        term.scrollLines(-lines);
        carryPx -= lines * linePx;
    }

    function onTouchEnd(): void {
        tracking = false;
        scrolling = false;
        carryPx = 0;
    }

    host.addEventListener('touchstart', onTouchStart, { passive: true, capture: true });
    host.addEventListener('touchmove', onTouchMove, { passive: false, capture: true });
    host.addEventListener('touchend', onTouchEnd, { capture: true });
    host.addEventListener('touchcancel', onTouchEnd, { capture: true });

    return () => {
        host.removeEventListener('touchstart', onTouchStart, true);
        host.removeEventListener('touchmove', onTouchMove, true);
        host.removeEventListener('touchend', onTouchEnd, true);
        host.removeEventListener('touchcancel', onTouchEnd, true);
    };
}
