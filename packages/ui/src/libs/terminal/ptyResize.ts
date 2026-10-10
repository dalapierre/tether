import { sendTerminalMessage } from '@ui/libs/api/sessions';
import type { Terminal } from '@xterm/xterm';

const DEBOUNCE_MS = 75;

type PtyResizeState = {
    timer: number | null;
    pending: { cols: number; rows: number; socket: WebSocket } | null;
    lastSent: { cols: number; rows: number } | null;
};

const ptyResizeState = new WeakMap<Terminal, PtyResizeState>();

function getState(term: Terminal): PtyResizeState {
    let state = ptyResizeState.get(term);
    if (!state) {
        state = { timer: null, pending: null, lastSent: null };
        ptyResizeState.set(term, state);
    }
    return state;
}

/**
 * Coalesce PTY resize messages while panels are dragged. Fitting every frame
 * is fine locally; SIGWINCH on every pixel makes the agent redraw and looks
 * like a fast scroll through the session.
 */
export function schedulePtyResize(term: Terminal, socket: WebSocket, cols: number, rows: number): void {
    const state = getState(term);
    state.pending = { cols, rows, socket };
    if (state.timer != null) return;

    state.timer = window.setTimeout(() => {
        state.timer = null;
        const pending = state.pending;
        state.pending = null;
        if (!pending || pending.socket.readyState !== WebSocket.OPEN) return;
        if (state.lastSent?.cols === pending.cols && state.lastSent?.rows === pending.rows) return;
        state.lastSent = { cols: pending.cols, rows: pending.rows };
        sendTerminalMessage(pending.socket, {
            type: 'resize',
            cols: pending.cols,
            rows: pending.rows,
        });
    }, DEBOUNCE_MS);
}

/** Send any pending resize immediately (e.g. after a panel drag ends). */
export function flushPtyResize(term: Terminal): void {
    const state = ptyResizeState.get(term);
    if (!state) return;
    if (state.timer != null) {
        window.clearTimeout(state.timer);
        state.timer = null;
    }
    const pending = state.pending;
    state.pending = null;
    if (!pending || pending.socket.readyState !== WebSocket.OPEN) return;
    if (state.lastSent?.cols === pending.cols && state.lastSent?.rows === pending.rows) return;
    state.lastSent = { cols: pending.cols, rows: pending.rows };
    sendTerminalMessage(pending.socket, {
        type: 'resize',
        cols: pending.cols,
        rows: pending.rows,
    });
}

export function clearPtyResize(term: Terminal): void {
    const state = ptyResizeState.get(term);
    if (!state) return;
    if (state.timer != null) {
        window.clearTimeout(state.timer);
        state.timer = null;
    }
    ptyResizeState.delete(term);
}
