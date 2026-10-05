export const styles = {
    root: 'relative overflow-hidden rounded-lg',
    actions: 'absolute inset-y-0 right-0 flex',
    deleteButton:
        'flex h-full min-w-20 items-center justify-center bg-red-600 px-4 text-sm font-medium text-white active:bg-red-500 disabled:opacity-60',
    panel: 'relative touch-pan-y will-change-transform rounded-lg bg-zinc-900',
    panelDragging: 'transition-none',
    panelSettling: 'transition-transform duration-200 ease-out',
};
