export const styles = {
    root: 'flex flex-1 flex-col bg-zinc-950 text-zinc-100',
    meta: 'flex items-center justify-between gap-3 border-b border-zinc-800 px-4 py-2 text-xs text-zinc-400',
    metaText: 'min-w-0 truncate',
    status: 'inline-flex shrink-0 items-center gap-1.5',
    statusDot: 'h-2 w-2 rounded-full',
    statusReady: 'bg-emerald-500',
    statusBusy: 'bg-amber-400',
    statusError: 'bg-red-500',
    terminalWrap: 'min-h-0 flex-1 overflow-hidden bg-black px-2 py-2',
    terminal: 'h-full w-full',
    keyboardBar:
        'flex items-center justify-center border-t border-zinc-800 px-4 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]',
    keyboardIcon: 'h-6 w-6',
    centered: 'flex flex-1 items-center justify-center px-4 text-sm text-zinc-500',
};
