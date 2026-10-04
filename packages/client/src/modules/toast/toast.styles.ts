export const styles = {
    stack: 'pointer-events-none fixed top-16 right-4 z-50 flex w-[min(100%-2rem,22rem)] flex-col gap-2',
    item: 'pointer-events-auto animate-toast-drop-in',
    toast: 'relative flex touch-pan-y items-start gap-2 overflow-hidden rounded-lg border bg-zinc-900 px-3 py-3 shadow-xl shadow-black/40',
    toastInfo: 'border-zinc-700',
    toastSuccess: 'border-zinc-700',
    toastError: 'border-red-800 bg-red-950',
    successBar: 'absolute inset-x-0 top-0 h-1 bg-emerald-500',
    content: 'min-w-0 flex-1',
    title: 'text-sm font-medium text-zinc-100',
    titleError: 'text-sm font-medium text-red-100',
    message: 'mt-0.5 text-sm text-zinc-400',
    messageError: 'mt-0.5 text-sm text-red-300/80',
    dismiss:
        'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xl leading-none text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100',
    dismissError:
        'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xl leading-none text-red-300/80 transition-colors hover:bg-red-900 hover:text-red-100',
};
