export const styles = {
    root: 'flex h-full min-h-0 flex-1 flex-col bg-zinc-950 text-zinc-100',
    body: 'flex min-h-0 flex-1 overflow-hidden md:grid md:grid-cols-[auto_minmax(0,1fr)] md:pl-2',
    bodyAnimate:
        'flex min-h-0 flex-1 overflow-hidden transition-[grid-template-columns] duration-200 ease-in-out md:grid md:grid-cols-[auto_minmax(0,1fr)] md:pl-2',
    panel: 'flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden md:min-h-0 md:min-w-0',
    panelHidden: 'hidden',
    /** Same width as PanelResizeHandle gap so collapse doesn’t shift main content. */
    resizeSpacer: 'w-2 shrink-0',
    main: 'flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden',
    mainHidden: 'hidden md:flex md:min-h-0 md:min-w-0 md:flex-1 md:flex-col md:overflow-hidden',
};
