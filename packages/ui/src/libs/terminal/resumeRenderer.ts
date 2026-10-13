import type { Terminal } from '@xterm/xterm';

type XtermRenderService = {
    _isPaused?: boolean;
};

type XtermCore = {
    _renderService?: XtermRenderService;
};

const RESUME_THROTTLE_MS = 250;
const lastResumeAt = new WeakMap<Terminal, number>();

/**
 * xterm.js 6's DOM renderer pauses via IntersectionObserver when it thinks the
 * screen is not intersecting. Parent layout/visibility changes can leave it
 * paused while the terminal still looks on-screen — `refresh()` alone does not
 * unpause, so the caret and output freeze until something forces a reflow.
 */
export function isXtermRendererPaused(term: Terminal): boolean {
    const core = (term as unknown as { _core?: XtermCore })._core;
    return Boolean(core?._renderService?._isPaused);
}

/**
 * Force a synchronous reflow that triggers xterm's IntersectionObserver without
 * taking the element out of the layout tree (`display:none` would pause it).
 */
export function forceXtermReflow(element: HTMLElement): void {
    const prev = element.style.paddingBottom;
    element.style.paddingBottom = prev === '0.05px' ? '0.1px' : '0.05px';
    void element.offsetHeight;
    element.style.paddingBottom = prev;
}

function xtermScreenElement(term: Terminal): HTMLElement | null {
    const screen = term.element?.querySelector('.xterm-screen');
    if (screen instanceof HTMLElement) return screen;
    return term.element ?? null;
}

/** Unpause a stuck DOM renderer and repaint (including the caret). */
export function resumeXtermRenderer(term: Terminal): void {
    const target = xtermScreenElement(term);
    if (!target) return;

    const wasPaused = isXtermRendererPaused(term);
    forceXtermReflow(target);
    // Mark a full refresh while IO may still report paused; unpause flushes it.
    term.refresh(0, Math.max(0, term.rows - 1));
    lastResumeAt.set(term, performance.now());

    requestAnimationFrame(() => {
        if (!term.element) return;
        if (wasPaused || isXtermRendererPaused(term)) {
            forceXtermReflow(target);
        }
        term.refresh(0, Math.max(0, term.rows - 1));
    });
}

/**
 * High-frequency paths (PTY output): always recover when paused, otherwise
 * opportunistically reflow at most every {@link RESUME_THROTTLE_MS}.
 */
export function resumeXtermRendererIfNeeded(term: Terminal): void {
    if (isXtermRendererPaused(term)) {
        resumeXtermRenderer(term);
        return;
    }
    const now = performance.now();
    const last = lastResumeAt.get(term) ?? 0;
    if (now - last < RESUME_THROTTLE_MS) return;
    resumeXtermRenderer(term);
}
