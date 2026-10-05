export const styles = {
    root: 'fixed inset-0 z-30 flex flex-col bg-zinc-950 text-zinc-100 md:items-center md:justify-center md:bg-black/60 md:p-6',
    shell: 'flex min-h-0 flex-1 flex-col bg-zinc-950 md:max-h-[min(44rem,100%)] md:w-full md:max-w-xl md:flex-none md:overflow-hidden md:rounded-xl md:border md:border-zinc-800 md:shadow-2xl',
    body: 'flex min-h-0 flex-1 flex-col overflow-auto px-4',
    loading: 'mt-8 text-sm text-zinc-500',
    categories: 'mt-6 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900',
    categoryButton:
        'flex w-full items-center justify-between gap-3 border-b border-zinc-800 px-4 py-3.5 text-left last:border-b-0 active:bg-zinc-800 md:hover:bg-zinc-800',
    categoryText: 'min-w-0 flex flex-col gap-0.5',
    categoryLabel: 'text-sm text-zinc-100',
    categoryDescription: 'text-xs text-zinc-500',
    categoryChevron: 'h-4 w-4 shrink-0 text-zinc-500',
    fields: 'mt-8 flex flex-col gap-3',
    label: 'block text-sm text-zinc-400',
    input: 'mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-zinc-100 outline-none focus:border-zinc-500',
    select: 'mt-1 w-full appearance-none rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-zinc-100 outline-none focus:border-zinc-500',
    hint: 'text-xs text-zinc-500',
    repositories: 'mt-1 flex flex-col gap-2',
    repositoryRow:
        'flex items-center justify-between gap-1 rounded-md border border-zinc-800 bg-zinc-900 py-0.5 pl-3 pr-0.5',
    repositoryName: 'min-w-0 truncate text-sm text-zinc-100',
    profileRow:
        'flex items-center justify-between gap-1 rounded-md border border-zinc-800 bg-zinc-900 py-0.5 pl-0.5 pr-0.5',
    profileRowButton:
        'min-w-0 flex-1 truncate rounded-md px-2.5 py-2 text-left text-sm text-zinc-100 transition-colors active:bg-zinc-800 md:hover:bg-zinc-800',
    repositoryEmpty: 'text-sm text-zinc-500',
    repositoriesList: 'mt-3',
    actions: 'mt-auto pt-10 pb-6',
    footer: 'px-4 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:pb-4',
};
