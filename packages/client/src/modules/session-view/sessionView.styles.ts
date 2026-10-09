export const styles = {
    root: 'flex min-h-0 flex-1 flex-col bg-zinc-950 text-zinc-100',
    headerPanel: 'shrink-0 pt-[max(0.25rem,env(safe-area-inset-top))] md:mx-2 md:mt-2 md:pt-0 [&>div]:flex-none',
    header: 'flex items-center gap-2 px-3 py-1.5',
    headerStart: 'flex min-w-0 flex-1 items-center gap-0.5',
    headerTitle: 'min-w-0 flex-1 truncate text-sm font-bold text-zinc-100',
    headerActions: 'flex shrink-0 items-center gap-1',
    mobileBack: 'shrink-0 md:hidden',
    agentTitleName: 'min-w-0 truncate',
    statusDot: 'h-2 w-2 shrink-0 rounded-full',
    statusDotConnecting: 'bg-amber-400',
    statusDotDisconnected: 'bg-red-500',
    statusDotReady: 'bg-emerald-500',
    statusDotBusy: 'bg-amber-400',
    statusDotError: 'bg-red-500',
    // Mobile: under tabs. Desktop: pinned below the main panes (flex order-last).
    metaPanel: 'shrink-0 md:order-last md:mx-2 md:mb-2 [&>div]:flex-none',
    meta: 'flex items-center gap-3 px-2 py-1.5 text-xs text-zinc-400 md:px-3',
    metaText: 'min-w-0 flex-1 truncate',
    metaRepo: 'font-bold text-zinc-200',
    metaBehindWarning: 'text-amber-400',
    metaBehindDanger: 'text-red-400',
    metaUsageGroup: 'ml-auto flex shrink-0 items-center gap-2',
    metaUsage: 'font-bold text-aura-green',
    metaUsageWarning: 'font-bold text-amber-400',
    metaUsageDanger: 'font-bold text-red-400',
    paneToolbarActions: 'hidden items-center gap-0.5 md:flex',
    paneToggle:
        'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-zinc-400 transition-colors md:hover:bg-zinc-800/80 md:hover:text-zinc-100',
    paneToggleIcon: 'h-3.5 w-3.5',
    tabs: 'shrink-0 border-t border-b border-zinc-800 px-4 py-2 md:hidden',
    main: 'relative flex min-h-0 flex-1 flex-col md:gap-0 md:p-2',
    content: 'relative min-h-0 flex-1 md:grid md:grid-cols-[minmax(0,1fr)]',
    pane: 'absolute inset-0 z-10 flex flex-col md:relative md:inset-auto md:z-auto md:min-h-0 md:min-w-0',
    paneReview: 'absolute inset-0 z-10 flex min-h-0 min-w-0 flex-col md:relative md:inset-auto md:z-auto',
    paneReviewFullscreen: 'absolute inset-0 z-10 flex min-h-0 min-w-0 flex-col md:relative md:inset-auto md:z-auto',
    // Mobile: stay laid out but invisible so terminal/review keep their state.
    // Desktop: fully unmount from layout (`hidden`) — Monaco sets visibility:visible
    // on internals which would otherwise punch through `invisible`.
    paneInactive: 'pointer-events-none absolute inset-0 z-0 flex flex-col invisible md:pointer-events-none md:hidden',
    reviewBody: 'flex min-h-0 flex-1 flex-col',
    terminalWrap: 'relative min-h-0 flex-1 overflow-hidden pb-[env(safe-area-inset-bottom)]',
    // Pin xterm's helper textarea to the top so iOS doesn't pan the visual
    // viewport chasing the cursor into the soft keyboard.
    terminal:
        'absolute inset-0 touch-pan-y overflow-hidden px-2 py-2 [&_.xterm-screen]:mx-auto [&_.xterm-helper-textarea]:!left-0 [&_.xterm-helper-textarea]:!top-0',
    shellTerminal:
        'absolute inset-0 touch-pan-y overflow-hidden px-2 py-2 [&_.xterm-helper-textarea]:!left-0 [&_.xterm-helper-textarea]:!top-0',
    shellPanelDesktop: 'relative hidden min-h-0 shrink-0 md:flex',
    shellPanelDesktopHidden: 'hidden',
    shellPanelMobile: 'absolute inset-0 z-20 flex flex-col md:hidden',
    shellPanelMobileHidden: 'pointer-events-none absolute inset-0 z-0 flex flex-col invisible md:hidden',
    shellCloseButton:
        'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-zinc-400 transition-colors active:bg-zinc-800 active:text-zinc-100 md:hover:bg-zinc-800/80 md:hover:text-zinc-100',
    shellCloseIcon: 'h-3.5 w-3.5',
    shellTerminalWrap: 'relative min-h-0 flex-1 overflow-hidden pb-[env(safe-area-inset-bottom)]',
    centered: 'flex flex-1 items-center justify-center px-4 text-sm text-zinc-500',
    mobileActions: 'flex items-center md:hidden',
    actionIcon: 'h-5 w-5',
    pasteBackdrop:
        'fixed inset-0 z-40 flex items-end justify-center bg-black/60 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-8 sm:items-center',
    pastePanel: 'w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900 p-5 shadow-lg',
    pasteTitle: 'text-base font-medium text-zinc-100',
    pasteHint: 'mt-1 text-sm text-zinc-400',
    pasteInput:
        'mt-4 w-full resize-none rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-aura-green',
    pasteActions: 'mt-4 flex flex-col gap-2',
};
