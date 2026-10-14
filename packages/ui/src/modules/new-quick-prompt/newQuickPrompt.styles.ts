export const styles = {
    form: 'flex min-h-0 flex-1 flex-col',
    sectionTitle: 'text-xl font-semibold tracking-tight text-zinc-100',
    fields: 'mt-6 flex flex-col gap-4',
    label: 'block text-sm text-zinc-400',
    input: 'mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-aura-green',
    textarea:
        'mt-1.5 w-full min-h-36 resize-y rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-aura-green',
    fieldHint: 'mt-1.5 block text-xs text-zinc-500',
    fieldMeta: 'mt-1.5 flex items-center justify-end gap-2 text-xs text-zinc-500',
    inputsSection: 'flex flex-col gap-3',
    inputRow: 'flex items-center gap-2',
    inputRowWrap: 'flex flex-col gap-1',
    inputRowField:
        'min-w-0 flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-aura-green',
    inputRowFieldError:
        'min-w-0 flex-1 rounded-md border border-red-500 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-red-400',
    inputRowSelect:
        'w-32 shrink-0 appearance-none rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-aura-green',
    removeInput:
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-zinc-700 text-zinc-400 outline-none transition-colors active:bg-zinc-800 active:text-zinc-100 md:hover:bg-zinc-800 md:hover:text-zinc-100',
    inputError: 'text-xs text-red-400',
    inputNameHint: 'text-xs text-zinc-500',
    addInputWrap: 'flex justify-center',
    footer: 'flex justify-end px-4 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:mx-auto md:w-full md:max-w-2xl md:pl-11 md:pr-4',
    creatingOverlay: 'absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-zinc-950/85',
    creatingSpinner: 'flex items-center justify-center',
    creatingLabel: 'text-sm text-zinc-400',
};
