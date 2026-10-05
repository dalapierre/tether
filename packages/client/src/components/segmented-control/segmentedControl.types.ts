export type SegmentedControlOption<T extends string> = {
    value: T;
    label: string;
    disabled?: boolean;
};

export type SegmentedControlProps<T extends string> = {
    options: SegmentedControlOption<T>[];
    value: T;
    onChange: (value: T) => void;
    ariaLabel: string;
};
