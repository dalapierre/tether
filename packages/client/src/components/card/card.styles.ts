export const styles = {
    button: 'relative w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-4 pr-10 text-left outline-none transition-[colors,box-shadow] duration-200 ease-out active:bg-zinc-800 focus-visible:border-zinc-500 md:hover:bg-zinc-800 md:hover:shadow-lg md:hover:shadow-black/40',
    buttonSelected:
        'relative w-full rounded-lg border border-zinc-500 bg-zinc-800 px-4 py-4 pr-10 text-left outline-none transition-[colors,box-shadow] duration-200 ease-out shadow-lg shadow-black/40 active:bg-zinc-800 focus-visible:border-zinc-400',
    title: 'text-base font-bold text-white',
    body: 'mt-1.5 flex flex-col gap-0.5',
    indicator: 'absolute top-3 right-3 h-2.5 w-2.5 rounded-full',
    indicatorReady: 'bg-emerald-500',
    indicatorBusy: 'bg-amber-400',
    indicatorError: 'bg-red-500',
};
