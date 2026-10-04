import type { ActiveToast } from './toast.types';
import { TOASTS, type ToastArgs, type ToastId } from './toasts';

type Listener = () => void;

let toasts: ActiveToast[] = [];
const listeners = new Set<Listener>();
let nextInstanceId = 0;

function emit() {
    for (const listener of listeners) {
        listener();
    }
}

export function showToast<Id extends ToastId>(id: Id, ...args: ToastArgs<Id>): string {
    const definition = TOASTS[id];
    const instanceId = `toast-${nextInstanceId++}`;
    const values =
        'values' in definition && typeof definition.values === 'function'
            ? (definition.values as unknown as (...valuesArgs: ToastArgs<Id>) => Record<string, string>)(...args)
            : undefined;
    const toast: ActiveToast = {
        instanceId,
        id,
        title: definition.title,
        message: definition.message,
        values,
    };

    toasts = [toast, ...toasts];
    emit();
    return instanceId;
}

export function dismissToast(instanceId: string) {
    const next = toasts.filter((toast) => toast.instanceId !== instanceId);
    if (next.length === toasts.length) return;
    toasts = next;
    emit();
}

export function subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

export function getSnapshot(): ActiveToast[] {
    return toasts;
}
