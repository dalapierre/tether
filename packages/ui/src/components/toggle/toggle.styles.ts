export const styles = {
    root: 'flex w-full items-center justify-between gap-3 text-left disabled:opacity-60',
    text: 'min-w-0 flex flex-1 flex-col gap-0.5',
    label: 'text-sm text-zinc-400',
    description: 'text-xs text-zinc-500',
    track: 'relative h-7 w-12 shrink-0 rounded-full transition-colors',
    trackOn: 'bg-emerald-500',
    trackOff: 'bg-zinc-700',
    thumb: 'absolute top-0.5 left-0.5 size-6 rounded-full bg-zinc-100 transition-transform',
    thumbOn: 'translate-x-5',
    thumbOff: 'translate-x-0',
};
