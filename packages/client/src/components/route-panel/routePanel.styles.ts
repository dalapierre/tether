export const styles = {
    root: 'relative flex min-h-0 flex-1 flex-col bg-zinc-950 text-zinc-100',
    panel: 'min-h-0 flex-1 !bg-zinc-950 md:mx-2 md:my-2',
    shell: 'flex min-h-0 flex-1 flex-col bg-zinc-950',
    body: 'flex min-h-0 flex-1 flex-col overflow-auto px-4 pt-10 md:mx-auto md:w-full md:max-w-2xl md:pl-11 md:pr-4 md:pt-14',
    closeButton:
        'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-base leading-none text-zinc-400 transition-colors md:hover:bg-zinc-800 md:hover:text-zinc-100 active:bg-zinc-800 disabled:opacity-60',
    backButton:
        'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-zinc-400 transition-colors md:hover:bg-zinc-800 md:hover:text-zinc-100 active:bg-zinc-800',
    backIcon: 'h-4 w-4',
    crumbs: 'flex min-w-0 items-center gap-1 overflow-hidden',
    crumb: 'shrink-0 text-zinc-500 transition-colors active:text-zinc-200 md:hover:text-zinc-200',
    crumbCurrent: 'min-w-0 truncate font-medium text-zinc-200',
    crumbButton:
        'shrink-0 border-0 bg-transparent p-0 text-xs text-zinc-500 transition-colors active:text-zinc-200 md:hover:text-zinc-200',
    separator: 'shrink-0 text-zinc-600',
};
