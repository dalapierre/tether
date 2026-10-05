export const styles = {
    root: 'flex min-h-0 flex-1 flex-col bg-zinc-950 text-zinc-100',
    meta: 'flex shrink-0 items-center justify-between gap-3 border-b border-zinc-800 px-4 py-2 text-xs text-zinc-400',
    metaText: 'min-w-0 truncate',
    metaRepo: 'font-bold text-zinc-200',
    metaBehind: 'text-zinc-500',
    metaEnd: 'flex shrink-0 items-center gap-3',
    reviewToggle:
        'hidden shrink-0 rounded-md border border-zinc-700 px-2.5 py-1 text-xs font-medium text-zinc-300 transition-colors md:inline md:hover:bg-zinc-800 md:hover:text-zinc-100',
    status: 'inline-flex shrink-0 items-center gap-1.5',
    statusDot: 'h-2 w-2 rounded-full',
    statusReady: 'bg-emerald-500',
    statusBusy: 'bg-amber-400',
    statusError: 'bg-red-500',
    tabs: 'shrink-0 border-b border-zinc-800 px-4 py-2 md:hidden',
    content: 'relative min-h-0 flex-1 md:grid md:grid-cols-[1fr_auto]',
    pane: 'absolute inset-0 z-10 flex flex-col md:relative md:inset-auto md:z-auto md:min-h-0 md:min-w-0',
    paneReview:
        'absolute inset-0 z-10 flex min-h-0 min-w-0 flex-col md:relative md:inset-auto md:z-auto md:border-l md:border-zinc-800',
    paneInactive:
        'pointer-events-none absolute inset-0 z-0 flex flex-col invisible md:pointer-events-none md:absolute md:invisible',
    reviewBody: 'flex min-h-0 flex-1 flex-col',
    terminalWrap: 'relative min-h-0 flex-1 overflow-hidden bg-black pb-[env(safe-area-inset-bottom)]',
    // Pin xterm's helper textarea to the top so iOS doesn't pan the visual
    // viewport chasing the cursor into the soft keyboard.
    terminal:
        'absolute inset-0 touch-pan-y overflow-hidden px-2 py-2 [&_.xterm-screen]:mx-auto [&_.xterm-helper-textarea]:!left-0 [&_.xterm-helper-textarea]:!top-0',
    centered: 'flex flex-1 items-center justify-center px-4 text-sm text-zinc-500',
    mobileActions: 'flex items-center md:hidden',
    actionIcon: 'h-5 w-5',
    pasteBackdrop:
        'fixed inset-0 z-40 flex items-end justify-center bg-black/60 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-8 sm:items-center',
    pastePanel: 'w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900 p-5 shadow-lg',
    pasteTitle: 'text-base font-medium text-zinc-100',
    pasteHint: 'mt-1 text-sm text-zinc-400',
    pasteInput:
        'mt-4 w-full resize-none rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-zinc-500',
    pasteActions: 'mt-4 flex flex-col gap-2',
};
