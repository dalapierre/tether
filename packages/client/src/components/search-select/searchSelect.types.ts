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
    disabled?: boolean;
    loading?: boolean;
    ariaLabel?: string;
};
