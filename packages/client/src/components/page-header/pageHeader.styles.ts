export const styles = {
    header: 'flex shrink-0 items-center gap-1 px-2 pt-[max(0.25rem,env(safe-area-inset-top))] pb-1 md:px-3 md:pt-2',
    start: 'flex min-h-11 min-w-0 flex-1 items-center gap-1',
    backIcon: 'h-5 w-5',
    crumbs: 'flex min-w-0 items-center gap-1.5 overflow-hidden pr-2 text-sm',
    crumbsInset: 'pl-2',
    crumb: 'shrink-0 text-zinc-400 transition-colors active:text-zinc-200 md:hover:text-zinc-200',
    crumbCurrent: 'min-w-0 truncate font-medium text-zinc-100',
    crumbButton:
        'shrink-0 border-0 bg-transparent p-0 text-sm text-zinc-400 transition-colors active:text-zinc-200 md:hover:text-zinc-200',
    separator: 'shrink-0 text-zinc-600',
    actions: 'flex shrink-0 items-center',
    settingsIcon: 'h-6 w-6',
};
