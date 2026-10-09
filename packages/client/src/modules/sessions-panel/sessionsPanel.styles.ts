export const styles = {
    wrap: 'relative box-border flex h-full min-h-0 w-full flex-col overflow-hidden transition-[width] duration-200 ease-in-out md:my-2 md:ml-2 md:h-[calc(100%-1rem)] md:w-auto md:max-w-full md:shrink-0',
    panel: 'box-border h-full min-h-0 min-w-0 flex-1 overflow-hidden',
    resize: 'z-30',
    header: 'relative flex h-11 shrink-0 items-center',
    iconSlot: 'inline-flex h-11 w-12 shrink-0 items-center justify-center',
    logoImage: 'h-7 w-7',
    logoButton:
        'inline-flex h-11 w-12 shrink-0 items-center justify-center rounded-md outline-none transition-colors focus-visible:ring-1 focus-visible:ring-aura-green active:bg-zinc-800 md:hover:bg-zinc-800',
    headerActions: 'absolute top-0 right-0 flex h-11 items-center pr-1 transition-opacity duration-200 ease-in-out',
    headerActionsHidden:
        'pointer-events-none absolute top-0 right-0 flex h-11 items-center pr-1 opacity-0 transition-opacity duration-200 ease-in-out',
    railIcon:
        'inline-flex h-11 w-12 shrink-0 items-center justify-center rounded-md text-zinc-400 outline-none transition-colors focus-visible:ring-1 focus-visible:ring-aura-green active:bg-zinc-800 active:text-zinc-100 md:hover:bg-zinc-800 md:hover:text-zinc-100',
    plusIcon: 'h-5 w-5',
    collapseIcon: 'h-5 w-5',
    listIcon: 'h-5 w-5',
    contentStack: 'relative grid min-h-0 flex-1 grid-cols-1 grid-rows-1 overflow-hidden',
    expanded:
        'col-start-1 row-start-1 flex min-h-0 flex-col overflow-hidden transition-opacity duration-200 ease-in-out',
    expandedHidden:
        'pointer-events-none col-start-1 row-start-1 flex min-h-0 flex-col overflow-hidden opacity-0 transition-opacity duration-200 ease-in-out',
    collapsedRail:
        'col-start-1 row-start-1 flex min-h-0 flex-col overflow-hidden transition-opacity duration-200 ease-in-out',
    collapsedRailHidden:
        'pointer-events-none col-start-1 row-start-1 flex min-h-0 flex-col overflow-hidden opacity-0 transition-opacity duration-200 ease-in-out',
    mainStack: 'flex min-h-0 flex-1 flex-col gap-3 overflow-hidden',
    sessionsSection: 'flex min-h-0 flex-1 flex-col overflow-hidden',
    search: 'shrink-0 px-2 pb-3',
    searchField: 'relative',
    searchInput:
        'w-full rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-2 pr-9 text-sm text-zinc-100 outline-none focus:border-aura-green [&::-webkit-search-cancel-button]:hidden',
    searchClear:
        'absolute right-1 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-zinc-400 transition-colors hover:text-zinc-100 active:bg-zinc-800',
    searchClearIcon: 'h-3.5 w-3.5',
    sectionLabel: 'shrink-0 px-3 pb-1 text-[11px] font-medium uppercase tracking-wide text-zinc-500',
    body: 'flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto px-2 pb-2',
    bodyEmpty: 'flex min-h-0 flex-1 flex-col items-center justify-center px-3 pb-2',
    placeholder: 'text-sm text-zinc-500',
    sessionRow: 'relative',
    sessionButton:
        'relative w-full rounded-md border border-zinc-800 bg-zinc-950/40 px-2.5 py-2 pr-8 text-left outline-none transition-colors active:bg-zinc-800 focus-visible:border-aura-green md:hover:bg-zinc-900',
    sessionButtonActive:
        'relative w-full rounded-md border border-zinc-700 bg-zinc-800 px-2.5 py-2 pr-8 text-left outline-none transition-colors focus-visible:border-aura-green',
    sessionButtonSelected:
        'relative w-full rounded-md border border-aura-green bg-zinc-800/80 px-2.5 py-2 pr-8 text-left outline-none transition-colors focus-visible:border-aura-green',
    sessionTitle: 'truncate text-sm font-bold text-zinc-100',
    sessionMeta: 'mt-0.5 min-w-0 truncate text-xs text-zinc-400',
    sessionMetaRepo: 'font-bold text-zinc-300',
    sessionMetaMuted: 'mt-0.5 min-w-0 truncate text-xs text-zinc-500',
    usageRow: 'mt-1 flex items-center gap-1.5',
    usage: 'text-[10px] font-bold text-aura-green',
    usageWarning: 'text-[10px] font-bold text-amber-400',
    usageDanger: 'text-[10px] font-bold text-red-400',
    trailing: 'absolute top-2 right-1.5 flex items-center gap-1',
    restartButton:
        'inline-flex h-5 w-5 items-center justify-center rounded text-zinc-400 transition-colors md:hover:bg-zinc-700 md:hover:text-zinc-100 active:bg-zinc-700 active:text-zinc-100 disabled:opacity-50',
    restartIcon: 'h-3 w-3',
    indicator: 'h-2 w-2 shrink-0 rounded-full',
    indicatorReady: 'bg-emerald-500',
    indicatorBusy: 'bg-amber-400',
    indicatorError: 'bg-red-500',
    inlineButton:
        'flex w-full shrink-0 items-center rounded-md text-sm text-zinc-400 outline-none transition-colors active:bg-zinc-800 active:text-zinc-100 focus-visible:ring-1 focus-visible:ring-aura-green md:hover:bg-zinc-800 md:hover:text-zinc-100',
    inlineButtonIcon: 'inline-flex h-11 w-12 shrink-0 items-center justify-center',
    inlineButtonLabel: 'min-w-0 flex-1 truncate pr-2.5 text-left',
    settings: 'shrink-0 pb-[max(0.5rem,env(safe-area-inset-bottom))]',
    settingsIcon: 'h-5 w-5 shrink-0',
    railSpacer: 'min-h-0 flex-1',
};
