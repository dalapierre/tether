export const styles = {
    // Match session header / meta panels: Panel owns chrome (radius + full border).
    // Desktop inset comes from AppShell main (gap + padding).
    panel: 'relative shrink-0 [&>div]:flex-none',
    list: 'panel-scroll flex h-7 min-w-0 items-stretch overflow-x-auto',
    tab: 'group relative flex max-w-[12rem] min-w-[5.5rem] shrink-0 cursor-pointer select-none items-center gap-1 border-x border-transparent bg-transparent px-2 text-left text-[12px] leading-none text-zinc-500 transition-colors md:hover:text-zinc-300',
    tabActive:
        'group relative flex max-w-[12rem] min-w-[5.5rem] shrink-0 cursor-pointer select-none items-center gap-1 border-x border-zinc-700 bg-transparent px-2 text-left text-[12px] font-bold leading-none text-white',
    tabOrigin: 'pointer-events-none opacity-30',
    tabDraggingCursor: 'cursor-grabbing',
    dropMarker: 'w-0.5 shrink-0 self-stretch bg-aura-green',
    separator: 'h-3.5 w-px shrink-0 self-center bg-zinc-700',
    tabLabel: 'min-w-0 flex-1 truncate select-none',
    close: 'group/close inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm text-[11px] leading-none text-zinc-500 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 md:hover:bg-zinc-800 md:hover:text-zinc-200',
    closeVisible: 'opacity-100',
    dirtyDot:
        'inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-300 group-hover/close:hidden group-focus-visible/close:hidden',
    closeGlyph: 'leading-none',
    closeGlyphDirty: 'hidden leading-none group-hover/close:inline group-focus-visible/close:inline',
    ghost: 'pointer-events-none fixed z-50 flex h-7 max-w-[12rem] min-w-[5.5rem] items-center gap-1 border border-zinc-700 bg-zinc-900 px-2 text-[12px] leading-none text-zinc-200 shadow-lg shadow-black/40',
    ghostActive: 'font-bold text-white',
    ghostLabel: 'min-w-0 flex-1 truncate',
    ghostClose: 'inline-flex h-4 w-4 shrink-0 items-center justify-center text-[11px] leading-none text-zinc-500',
    ghostDirtyDot: 'inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-300',
};
