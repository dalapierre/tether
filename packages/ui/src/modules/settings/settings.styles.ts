export const styles = {
    sectionHeader: 'flex flex-col',
    sectionTitleRow: 'relative',
    sectionBack:
        'absolute top-1/2 right-full mr-1 -translate-y-1/2 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-zinc-400 transition-colors md:hover:bg-zinc-800 md:hover:text-zinc-100 active:bg-zinc-800',
    sectionTitle: 'text-2xl font-semibold tracking-tight text-zinc-100',
    sectionDescription: 'mt-1.5 text-sm text-zinc-500',
    backIcon: 'h-5 w-5',
    loading: 'mt-8 text-sm text-zinc-500',
    categories: 'mt-6 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900',
    categoryButton:
        'flex w-full items-center justify-between gap-3 border-b border-zinc-800 px-4 py-3.5 text-left last:border-b-0 active:bg-zinc-800 md:hover:bg-zinc-800',
    categoryText: 'min-w-0 flex flex-col gap-0.5',
    categoryLabel: 'text-sm text-zinc-100',
    categoryDescription: 'text-xs text-zinc-500',
    categoryChevron: 'h-4 w-4 shrink-0 text-zinc-500',
    fields: 'mt-6 flex flex-col gap-3',
    label: 'block text-sm text-zinc-400',
    input: 'mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-base text-zinc-100 outline-none focus:border-aura-green',
    select: 'mt-1 w-full appearance-none rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-base text-zinc-100 outline-none focus:border-aura-green',
    hint: 'text-xs text-zinc-500',
    inlineField: 'flex w-full items-center justify-between gap-3',
    inlineFieldText: 'min-w-0 flex flex-1 flex-col gap-0.5',
    inlineFieldLabel: 'text-sm text-zinc-400',
    inlineFieldHint: 'text-xs text-zinc-500',
    inlineFieldInput:
        'w-20 shrink-0 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-center text-base text-zinc-100 outline-none focus:border-aura-green',
    repositories: 'mt-1 flex flex-col gap-2',
    profileRow:
        'flex items-center justify-between gap-1 rounded-md border border-zinc-800 bg-zinc-900 py-0.5 pl-0.5 pr-0.5 transition-colors active:bg-zinc-800 md:hover:bg-zinc-800',
    profileRowButton: 'min-w-0 flex-1 truncate rounded-md px-2.5 py-2 text-left text-sm text-zinc-100',
    repositoryEmpty: 'text-sm text-zinc-500',
    footer: 'px-4 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:mx-auto md:w-full md:max-w-2xl md:pl-11 md:pr-4 md:pb-4',
    footerActions: 'flex flex-row gap-2',
    footerAction: 'min-w-0 flex-1',
    keybindList: 'overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900',
    keybindRow: 'flex items-center justify-between gap-3 border-b border-zinc-800 px-4 py-3 last:border-b-0',
    keybindText: 'min-w-0 flex flex-col gap-0.5',
    keybindLabel: 'text-sm text-zinc-100',
    keybindConflict: 'text-xs text-amber-400',
    keybindButton:
        'shrink-0 rounded-md border border-zinc-700 bg-zinc-950 px-3 py-1.5 font-mono text-xs text-zinc-200 outline-none active:bg-zinc-800 md:hover:bg-zinc-800',
    keybindButtonRecording:
        'shrink-0 rounded-md border border-aura-green bg-aura-green/15 px-3 py-1.5 font-mono text-xs text-aura-green outline-none',
    keybindButtonConflict:
        'shrink-0 rounded-md border border-amber-700 bg-zinc-950 px-3 py-1.5 font-mono text-xs text-amber-200 outline-none active:bg-zinc-800 md:hover:bg-zinc-800',
};
