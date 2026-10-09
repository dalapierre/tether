import type { Terminal } from '@xterm/xterm';

type XtermCore = {
    scrollToBottom?: (immediate?: boolean) => void;
};

/**
 * Jump the viewport to the bottom without xterm's smooth scroll path.
 * Public `scrollToBottom()` goes through `scrollLines` + `reuseAnimation`.
 */
export function scrollTerminalToBottomNow(term: Terminal): void {
    const core = (term as unknown as { _core?: XtermCore })._core;
    if (core?.scrollToBottom) {
        core.scrollToBottom(true);
        return;
    }
    term.scrollToBottom();
}

/**
 * Load a large history dump without painting every parsed chunk (which looks
 * like a fast scroll through the whole conversation).
 */
export function writeTerminalHistory(term: Terminal, data: string, onDone: () => void): void {
    const element = term.element;
    if (element) {
        element.style.visibility = 'hidden';
    }
    term.write(data, () => {
        scrollTerminalToBottomNow(term);
        if (element) {
            element.style.visibility = '';
        }
        onDone();
    });
}
