export const styles = {
    form: 'flex min-h-0 flex-1 flex-col',
    sectionTitle: 'text-2xl font-semibold tracking-tight text-zinc-100',
    sectionDescription: 'mt-1.5 text-sm text-zinc-500',
    loading: 'mt-8 text-sm text-zinc-500',
    fields: 'mt-6 flex flex-col gap-4',
    label: 'block text-sm text-zinc-400',
    input: 'mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-base text-zinc-100 outline-none focus:border-aura-green',
    advanced: 'flex flex-col gap-3',
    advancedToggle:
        'flex w-full items-center justify-between gap-2 rounded-md py-1 text-left text-sm text-zinc-400 outline-none transition-colors active:text-zinc-200 md:hover:text-zinc-200',
    advancedChevron: 'h-4 w-4 shrink-0 text-zinc-500 transition-transform',
    advancedChevronOpen: 'h-4 w-4 shrink-0 rotate-180 text-zinc-500 transition-transform',
    advancedFields: 'flex flex-col gap-4',
    footer: 'px-4 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:mx-auto md:w-full md:max-w-2xl md:pl-11 md:pr-4',
    startingOverlay: 'absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-zinc-950/85',
    startingSpinner: 'flex items-center justify-center',
    startingLabel: 'text-sm text-zinc-400',
};
