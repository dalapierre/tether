import type { MessageDescriptor } from 'react-intl';
import type { ToastId } from './toasts';

export type ActiveToast = {
    instanceId: string;
    id: ToastId;
    title: MessageDescriptor;
    message: MessageDescriptor;
    values?: Record<string, string>;
};
