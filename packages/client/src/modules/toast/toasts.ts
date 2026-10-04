export const TOASTS = {
    'generic-error': {
        title: 'Something went wrong',
        message: (detail: string) => detail,
    },
    'settings-saved': {
        title: 'Settings saved',
        message: 'Your settings have been updated.',
    },
    'repository-added': {
        title: 'Repository added',
        message: (name: string) => `${name} was added successfully.`,
    },
} as const;

export type ToastId = keyof typeof TOASTS;

type ToastMessage<Id extends ToastId> = (typeof TOASTS)[Id]['message'];

export type ToastArgs<Id extends ToastId> = ToastMessage<Id> extends (...args: infer Args) => string ? Args : [];
