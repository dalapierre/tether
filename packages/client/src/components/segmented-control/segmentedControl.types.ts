export type SegmentedControlOption<T extends string> = {
    value: T;
    label: string;
};

export type SegmentedControlProps<T extends string> = {
    options: SegmentedControlOption<T>[];
    value: T;
    onChange: (value: T) => void;
    ariaLabel: string;
};
