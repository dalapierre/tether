type Listener = () => void;

let dragging = false;
/** Bumps on begin and end so stale rAF callbacks from mid-drag can detect a finished drag. */
let epoch = 0;
const startListeners = new Set<Listener>();
const endListeners = new Set<Listener>();

/** True while any panel splitter is being dragged. */
export function isPanelResizeDragging(): boolean {
    return dragging;
}

/** Monotonic counter; changes whenever a drag starts or ends. */
export function getPanelResizeDragEpoch(): number {
    return epoch;
}

export function beginPanelResizeDrag(): void {
    dragging = true;
    epoch += 1;
    for (const listener of startListeners) {
        listener();
    }
}

export function endPanelResizeDrag(): void {
    if (!dragging) {
        return;
    }
    dragging = false;
    epoch += 1;
    for (const listener of endListeners) {
        listener();
    }
}

/** Subscribe to the start of any panel splitter drag. */
export function onPanelResizeDragStart(listener: Listener): () => void {
    startListeners.add(listener);
    return () => {
        startListeners.delete(listener);
    };
}

/** Subscribe to the end of any panel splitter drag. */
export function onPanelResizeDragEnd(listener: Listener): () => void {
    endListeners.add(listener);
    return () => {
        endListeners.delete(listener);
    };
}
