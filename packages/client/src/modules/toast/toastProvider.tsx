import { useSyncExternalStore, type ReactNode } from 'react';
import { styles } from './toast.styles';
import { ToastItem } from './toastItem';
import { getSnapshot, subscribe } from './toastStore';

export function ToastProvider({ children }: { children: ReactNode }) {
    const toasts = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

    return (
        <>
            {children}
            <div className={styles.stack} aria-live='polite' aria-relevant='additions text'>
                {toasts.map((toast) => (
                    <ToastItem key={toast.instanceId} toast={toast} />
                ))}
            </div>
        </>
    );
}
