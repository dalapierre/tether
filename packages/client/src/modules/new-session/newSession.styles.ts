export const styles = {
    root: 'fixed inset-0 z-20 flex flex-col bg-zinc-950 text-zinc-100',
    body: 'flex min-h-0 flex-1 flex-col gap-4 overflow-auto px-4',
    loading: 'mt-8 text-sm text-zinc-500',
    form: 'flex flex-col gap-4',
    label: 'block text-sm text-zinc-400',
    checkboxLabel: 'flex cursor-pointer items-center gap-2 text-sm text-zinc-400',
    checkbox: 'size-4 shrink-0 rounded border border-zinc-700 bg-zinc-900 accent-zinc-200 disabled:opacity-50',
    input: 'mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-zinc-100 outline-none focus:border-zinc-500',
    select: 'mt-1 w-full appearance-none rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-zinc-100 outline-none focus:border-zinc-500',
    footer: 'px-4 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]',
};
