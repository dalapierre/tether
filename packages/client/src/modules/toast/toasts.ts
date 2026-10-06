import type { MessageDescriptor } from 'react-intl';
import { messages } from './toast.messages';

export type ToastType = 'success' | 'error' | 'info';

type ToastDefinition = {
    type: ToastType;
    title: MessageDescriptor;
    message: MessageDescriptor;
    values?: (...args: never[]) => Record<string, string>;
};

export const TOASTS = {
    'generic-error': {
        type: 'error',
        title: messages.genericErrorTitle,
        message: messages.genericErrorMessage,
        values: (detail: string) => ({ detail }),
    },
    'invalid-branch-name': {
        type: 'error',
        title: messages.invalidBranchTitle,
        message: messages.invalidBranchMessage,
    },
    'settings-saved': {
        type: 'success',
        title: messages.settingsSavedTitle,
        message: messages.settingsSavedMessage,
    },
    'session-ready': {
        type: 'success',
        title: messages.sessionReadyTitle,
        message: messages.sessionReadyMessage,
        values: (name: string) => ({ name }),
    },
    'session-error': {
        type: 'error',
        title: messages.sessionErrorTitle,
        message: messages.sessionErrorMessage,
        values: (name: string) => ({ name }),
    },
} as const satisfies Record<string, ToastDefinition>;

export type ToastId = keyof typeof TOASTS;

type ToastValuesFn<Id extends ToastId> = (typeof TOASTS)[Id] extends { values: infer Values } ? Values : undefined;

export type ToastArgs<Id extends ToastId> =
    ToastValuesFn<Id> extends (...args: infer Args) => Record<string, string> ? Args : [];
