import { useSyncExternalStore, type ReactNode } from 'react';
import { styles } from './toast.styles';
import { dismissToast, getSnapshot, subscribe } from './toastStore';

export function ToastProvider({ children }: { children: ReactNode }) {
    const toasts = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

    return (
        <>
            {children}
            <div className={styles.stack} aria-live='polite' aria-relevant='additions text'>
                {toasts.map((toast) => (
                    <div key={toast.instanceId} className={styles.toast} role='status'>
                        <div className={styles.content}>
                            <p className={styles.title}>{toast.title}</p>
                            <p className={styles.message}>{toast.message}</p>
                        </div>
                        <button
                            type='button'
                            className={styles.dismiss}
                            aria-label='Dismiss'
                            onClick={() => dismissToast(toast.instanceId)}
                        >
                            ×
                        </button>
                    </div>
                ))}
            </div>
        </>
    );
}
