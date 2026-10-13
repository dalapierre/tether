export type SearchSelectOption<T extends string = string> = {
    value: T;
    label: string;
};

export type SearchSelectProps<T extends string = string> = {
    options: SearchSelectOption<T>[];
    onSelect: (option: SearchSelectOption<T>) => void;
    /**
     * When set, shows the selected option label while the input is not focused
     * (ignored when `allowCustom` is true — then `value` is the input text).
     */
    value?: T | null;
    /**
     * When true, the typed text is kept as the value even if it does not match
     * an option. Use with `onChange` to control free-text input.
     */
    allowCustom?: boolean;
    /** Fired when the typed value changes (required for meaningful `allowCustom` use). */
    onChange?: (value: string) => void;
    placeholder?: string;
    emptyMessage?: string;
    noResultsMessage?: string;
    /** Shown in the list when matches exceed the visible cap. */
    limitMessage?: string;
    disabled?: boolean;
    /**
     * When true, keeps the input usable and shows a right-side spinner after a short delay.
     * Does not block typing or opening the dropdown.
     */
    loading?: boolean;
    /** Accessible label for the loading spinner. */
    loadingLabel?: string;
    ariaLabel?: string;
};
