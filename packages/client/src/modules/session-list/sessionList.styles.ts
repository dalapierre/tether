export const styles = {
    root: 'grid min-h-0 flex-1 grid-rows-[auto_auto_1fr] bg-zinc-950 text-zinc-100',
    search: 'px-4 pt-3 pb-1 md:mx-auto md:w-full md:max-w-2xl md:pt-4',
    searchField: 'relative',
    searchInput:
        'w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2.5 pr-10 text-base text-zinc-100 outline-none focus:border-aura-green [&::-webkit-search-cancel-button]:hidden',
    searchClear:
        'absolute right-1.5 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-zinc-400 transition-colors hover:text-zinc-100 active:bg-zinc-800',
    searchClearIcon: 'h-4 w-4',
    body: 'flex min-h-0 flex-col gap-3 overflow-auto px-4 pt-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:mx-auto md:w-full md:max-w-2xl',
    bodyEmpty:
        'flex min-h-0 flex-col items-center justify-center px-4 pt-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:mx-auto md:w-full md:max-w-2xl',
    placeholder: 'text-sm text-zinc-500',
    plusIcon: 'h-6 w-6',
    project: 'truncate text-sm text-zinc-400',
    feature: 'truncate text-xs text-zinc-500',
};
