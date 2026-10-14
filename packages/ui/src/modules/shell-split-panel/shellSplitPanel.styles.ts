export const styles = {
    shellTerminal:
        'absolute inset-0 touch-pan-y overflow-hidden px-2 py-2 [&_.xterm-helper-textarea]:!left-0 [&_.xterm-helper-textarea]:!top-0',
    shellToolbarActions: 'flex items-center gap-0.5',
    shellToolbarButton:
        'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-zinc-400 transition-colors active:bg-zinc-800 active:text-zinc-100 md:hover:bg-zinc-800/80 md:hover:text-zinc-100 disabled:pointer-events-none disabled:opacity-40',
    shellToolbarButtonActive: 'bg-zinc-800/80 text-zinc-100',
    shellToolbarSeparator: 'mx-0.5 h-3.5 w-px shrink-0 bg-zinc-700',
    shellToolbarIcon: 'h-3.5 w-3.5',
    shellPanelBody: 'flex min-h-0 flex-1 overflow-hidden pb-[env(safe-area-inset-bottom)]',
    shellSplits: 'flex min-h-0 min-w-0 flex-1',
    shellSplitPane: 'relative min-h-0 min-w-0 flex-1 overflow-hidden border-r border-zinc-800 last:border-r-0',
    shellTerminalPane: 'relative h-full min-h-0 w-full overflow-hidden',
    shellListRail: 'relative flex shrink-0 border-l border-zinc-800 bg-zinc-900/80',
    shellList: 'panel-scroll flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto p-1',
    shellListItem: 'group flex min-h-7 items-center rounded-md text-zinc-400',
    shellListItemActive: 'bg-zinc-800 text-zinc-100',
    shellListTab:
        'flex min-w-0 flex-1 items-center px-2 py-1 text-left text-[11px] leading-tight transition-colors md:hover:text-zinc-100',
    shellListTabLabel: 'min-w-0 flex-1 truncate',
    shellListKill:
        'mr-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 md:hover:bg-zinc-700 md:hover:text-zinc-100',
    shellListKillIcon: 'h-3 w-3',
};
