export const styles = {
    root: 'flex min-h-0 flex-1 flex-col bg-zinc-950 text-zinc-100',
    connectionStatus: 'flex items-center gap-1.5 px-2 text-xs text-zinc-400',
    connectionDot: 'h-2 w-2 shrink-0 rounded-full',
    connectionDotConnecting: 'bg-amber-400',
    connectionDotDisconnected: 'bg-red-500',
    // Desktop: match PageHeader inset (md:px-3) and back IconButton (w-11) + gap-1
    // so repo/branch and the review control line up with the breadcrumb row.
    meta: 'flex shrink-0 items-center justify-between gap-3 border-b border-zinc-800 px-4 py-2 text-xs text-zinc-400 md:px-[3.75rem]',
    metaText: 'min-w-0 truncate',
    metaRepo: 'font-bold text-zinc-200',
    metaBehind: 'text-zinc-500',
    metaEnd: 'flex shrink-0 items-center gap-1.5',
    paneToggle:
        'hidden shrink-0 items-center justify-center rounded-md border border-zinc-700 p-1.5 text-zinc-300 transition-colors md:inline-flex md:hover:bg-zinc-800 md:hover:text-zinc-100',
    paneToggleActive: 'bg-zinc-800 text-zinc-100',
    paneToggleIcon: 'h-4 w-4',
    tabs: 'shrink-0 border-b border-zinc-800 px-4 py-2 md:hidden',
    main: 'relative flex min-h-0 flex-1 flex-col',
    content: 'relative min-h-0 flex-1 md:grid md:grid-cols-[1fr_auto]',
    pane: 'absolute inset-0 z-10 flex flex-col md:relative md:inset-auto md:z-auto md:min-h-0 md:min-w-0',
    paneReview:
        'absolute inset-0 z-10 flex min-h-0 min-w-0 flex-col md:relative md:inset-auto md:z-auto md:border-l md:border-zinc-800',
    // Mobile: stay laid out but invisible so terminal/review keep their state.
    // Desktop: fully unmount from layout (`hidden`) — Monaco sets visibility:visible
    // on internals which would otherwise punch through `invisible`.
    paneInactive: 'pointer-events-none absolute inset-0 z-0 flex flex-col invisible md:pointer-events-none md:hidden',
    reviewBody: 'flex min-h-0 flex-1 flex-col',
    terminalWrap: 'relative min-h-0 flex-1 overflow-hidden bg-zinc-950 pb-[env(safe-area-inset-bottom)]',
    // Pin xterm's helper textarea to the top so iOS doesn't pan the visual
    // viewport chasing the cursor into the soft keyboard.
    terminal:
        'absolute inset-0 touch-pan-y overflow-hidden px-2 py-2 [&_.xterm-screen]:mx-auto [&_.xterm-helper-textarea]:!left-0 [&_.xterm-helper-textarea]:!top-0',
    // Shell terminal: flush edges — no padding/centering (agent keeps the inset above).
    shellTerminal:
        'absolute inset-0 touch-pan-y overflow-hidden [&_.xterm-helper-textarea]:!left-0 [&_.xterm-helper-textarea]:!top-0',
    shellPanelDesktop:
        'relative hidden min-h-0 shrink-0 flex-col overflow-hidden border-t border-zinc-800 bg-zinc-950 md:flex',
    shellPanelDesktopHidden: 'hidden',
    shellPanelMobile: 'absolute inset-0 z-20 flex flex-col bg-zinc-950 md:hidden',
    shellPanelMobileHidden: 'pointer-events-none absolute inset-0 z-0 flex flex-col invisible md:hidden',
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
