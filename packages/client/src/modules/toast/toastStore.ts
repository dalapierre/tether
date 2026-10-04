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

function resolveText(value: string | ((...args: never[]) => string), args: unknown[]): string {
    return typeof value === 'function' ? (value as (...args: unknown[]) => string)(...args) : value;
}

export function showToast<Id extends ToastId>(id: Id, ...args: ToastArgs<Id>): string {
    const definition = TOASTS[id];
    const instanceId = `toast-${nextInstanceId++}`;
    const toast: ActiveToast = {
        instanceId,
        id,
        title: resolveText(definition.title, args),
        message: resolveText(definition.message, args),
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
