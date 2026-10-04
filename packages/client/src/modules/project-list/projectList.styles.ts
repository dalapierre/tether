export const styles = {
    root: 'flex min-h-dvh flex-col bg-zinc-950 text-zinc-100',
    header: 'flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3',
    title: 'text-xl font-semibold tracking-tight',
    content: 'flex flex-1 flex-col gap-3 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]',
    empty: 'mt-8 text-center text-sm text-zinc-500',
    error: 'text-sm text-red-400',
    loading: 'mt-8 text-center text-sm text-zinc-500',
    formOverlay:
        'fixed inset-0 z-10 flex flex-col bg-zinc-950 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]',
    formHeader: 'flex items-center justify-between pb-6',
    formTitle: 'text-xl font-semibold tracking-tight',
    form: 'flex flex-1 flex-col gap-4',
    label: 'block text-sm text-zinc-400',
    input: 'mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-zinc-100 outline-none focus:border-zinc-500',
    formActions: 'mt-auto space-y-3',
};
