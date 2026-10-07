export const styles = {
    root: 'relative',
    button: 'relative w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-4 pr-10 text-left outline-none transition-[colors,box-shadow] duration-200 ease-out active:bg-zinc-800 focus-visible:border-aura-green md:hover:bg-zinc-800 md:hover:shadow-lg md:hover:shadow-black/40',
    buttonWithRestart:
        'relative w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-4 pr-16 text-left outline-none transition-[colors,box-shadow] duration-200 ease-out active:bg-zinc-800 focus-visible:border-aura-green md:hover:bg-zinc-800 md:hover:shadow-lg md:hover:shadow-black/40',
    buttonSelected:
        'relative w-full rounded-lg border border-aura-green bg-zinc-800 px-4 py-4 pr-10 text-left outline-none transition-[colors,box-shadow] duration-200 ease-out shadow-lg shadow-black/40 active:bg-zinc-800 focus-visible:border-aura-green',
    buttonSelectedWithRestart:
        'relative w-full rounded-lg border border-aura-green bg-zinc-800 px-4 py-4 pr-16 text-left outline-none transition-[colors,box-shadow] duration-200 ease-out shadow-lg shadow-black/40 active:bg-zinc-800 focus-visible:border-aura-green',
    title: 'text-base font-bold text-zinc-100',
    body: 'mt-1.5 flex flex-col gap-0.5',
    trailing: 'absolute top-3 right-3 flex items-center gap-1.5',
    restartButton:
        'inline-flex h-6 w-6 items-center justify-center rounded text-zinc-400 transition-colors md:hover:bg-zinc-700 md:hover:text-zinc-100 active:bg-zinc-700 active:text-zinc-100 disabled:opacity-50',
    restartIcon: 'h-3.5 w-3.5',
    indicator: 'h-2.5 w-2.5 shrink-0 rounded-full',
    indicatorReady: 'bg-emerald-500',
    indicatorBusy: 'bg-amber-400',
    indicatorError: 'bg-red-500',
};
