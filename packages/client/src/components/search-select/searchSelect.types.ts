export type SearchSelectOption<T extends string = string> = {
    value: T;
    label: string;
};

export type SearchSelectProps<T extends string = string> = {
    options: SearchSelectOption<T>[];
    onSelect: (option: SearchSelectOption<T>) => void;
    placeholder?: string;
    emptyMessage?: string;
    noResultsMessage?: string;
    disabled?: boolean;
    loading?: boolean;
    ariaLabel?: string;
};
