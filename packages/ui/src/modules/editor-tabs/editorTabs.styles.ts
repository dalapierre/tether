export const styles = {
    // Match session header / meta panels: Panel owns chrome (radius + full border).
    panel: 'shrink-0 md:mt-2 md:mr-2 [&>div]:flex-none',
    list: 'panel-scroll flex h-7 min-w-0 items-stretch overflow-x-auto',
    tab: 'group relative flex max-w-[12rem] min-w-[5.5rem] shrink-0 cursor-pointer items-center gap-1 border-x border-transparent bg-transparent px-2 text-left text-[12px] leading-none text-zinc-500 transition-colors md:hover:text-zinc-300',
    tabActive:
        'group relative flex max-w-[12rem] min-w-[5.5rem] shrink-0 cursor-pointer items-center gap-1 border-x border-zinc-700 bg-transparent px-2 text-left text-[12px] leading-none text-zinc-200 after:absolute after:inset-x-0 after:top-0 after:h-0.5 after:bg-aura-green',
    separator: 'h-3.5 w-px shrink-0 self-center bg-zinc-700',
    tabLabel: 'min-w-0 flex-1 truncate',
    close: 'inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm text-[11px] leading-none text-zinc-500 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 md:hover:bg-zinc-800 md:hover:text-zinc-200',
    closeVisible: 'opacity-100',
};
