import type { MessageDescriptor } from 'react-intl';
import { messages } from './toast.messages';

type ToastDefinition = {
    title: MessageDescriptor;
    message: MessageDescriptor;
    values?: (...args: never[]) => Record<string, string>;
};

export const TOASTS = {
    'generic-error': {
        title: messages.genericErrorTitle,
        message: messages.genericErrorMessage,
        values: (detail: string) => ({ detail }),
    },
    'settings-saved': {
        title: messages.settingsSavedTitle,
        message: messages.settingsSavedMessage,
    },
    'repository-added': {
        title: messages.repositoryAddedTitle,
        message: messages.repositoryAddedMessage,
        values: (name: string) => ({ name }),
    },
} as const satisfies Record<string, ToastDefinition>;

export type ToastId = keyof typeof TOASTS;

type ToastValuesFn<Id extends ToastId> = (typeof TOASTS)[Id] extends { values: infer Values } ? Values : undefined;

export type ToastArgs<Id extends ToastId> =
    ToastValuesFn<Id> extends (...args: infer Args) => Record<string, string> ? Args : [];
