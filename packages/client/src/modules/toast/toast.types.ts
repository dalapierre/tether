import type { ToastId } from './toasts';

export type ActiveToast = {
    instanceId: string;
    id: ToastId;
    title: string;
    message: string;
};
