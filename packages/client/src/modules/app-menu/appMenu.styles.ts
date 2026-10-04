export const styles = {
    menuButton:
        'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-zinc-100 transition-colors active:bg-zinc-800',
    menuIcon: 'h-6 w-6',
    overlay: 'fixed inset-0 z-40 bg-black/50',
    panel: 'fixed inset-y-0 left-0 z-50 flex w-64 max-w-[85vw] flex-col bg-zinc-900 pt-[max(0.75rem,env(safe-area-inset-top))] shadow-xl',
    panelHeader: 'flex items-center justify-between px-2 pb-2',
    panelTitle: 'px-3 text-sm font-medium tracking-wide text-zinc-400 uppercase',
    closeButton:
        'inline-flex h-11 w-11 items-center justify-center rounded-md text-2xl leading-none text-zinc-100 transition-colors active:bg-zinc-800',
    nav: 'flex flex-col gap-1 px-2 pb-4',
    item: 'rounded-md px-3 py-3 text-base text-zinc-300 transition-colors active:bg-zinc-800',
    itemActive: 'rounded-md bg-zinc-800 px-3 py-3 text-base text-zinc-50',
};
