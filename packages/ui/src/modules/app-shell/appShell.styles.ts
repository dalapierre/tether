export const styles = {
    root: 'flex h-full min-h-0 flex-1 flex-col bg-zinc-950 text-zinc-100',
    /** Default desktop columns: rail + gap + list + resize + main; inline style collapses gap/list/resize when closed. */
    body: 'flex min-h-0 flex-1 overflow-hidden md:grid md:grid-cols-[50px_auto_320px_auto_minmax(0,1fr)] md:pl-2',
    bodyAnimate:
        'flex min-h-0 flex-1 overflow-hidden transition-[grid-template-columns] duration-200 ease-in-out md:grid md:grid-cols-[50px_auto_320px_auto_minmax(0,1fr)] md:pl-2',
    /** Collapsed resize track; width is driven to 0 via grid-template-columns. */
    resizeSpacer: 'min-w-0 overflow-hidden',
    /** Desktop inset around tabs + page content so every route shares the same gaps. */
    main: 'flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden md:gap-2 md:pt-2 md:pr-2 md:pb-2',
    mainHidden:
        'hidden md:flex md:min-h-0 md:min-w-0 md:flex-1 md:flex-col md:gap-2 md:overflow-hidden md:pt-2 md:pr-2 md:pb-2',
};
