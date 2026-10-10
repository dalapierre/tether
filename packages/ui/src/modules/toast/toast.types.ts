import type { MessageDescriptor } from 'react-intl';
import type { ToastId, ToastType } from './toasts';

export type ActiveToast = {
    instanceId: string;
    id: ToastId;
    type: ToastType;
    title: MessageDescriptor;
    message: MessageDescriptor;
    values?: Record<string, string>;
};
