import { useSyncExternalStore, type ReactNode } from 'react';
import { useIntl } from 'react-intl';
import { messages } from './toast.messages';
import { styles } from './toast.styles';
import { dismissToast, getSnapshot, subscribe } from './toastStore';

export function ToastProvider({ children }: { children: ReactNode }) {
    const intl = useIntl();
    const toasts = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

    return (
        <>
            {children}
            <div className={styles.stack} aria-live='polite' aria-relevant='additions text'>
                {toasts.map((toast) => (
                    <div key={toast.instanceId} className={styles.toast} role='status'>
                        <div className={styles.content}>
                            <p className={styles.title}>{intl.formatMessage(toast.title, toast.values)}</p>
                            <p className={styles.message}>{intl.formatMessage(toast.message, toast.values)}</p>
                        </div>
                        <button
                            type='button'
                            className={styles.dismiss}
                            aria-label={intl.formatMessage(messages.dismiss)}
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
