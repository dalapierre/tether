import { styles } from './segmentedControl.styles';
import type { SegmentedControlProps } from './segmentedControl.types';

export function SegmentedControl<T extends string>({ options, value, onChange, ariaLabel }: SegmentedControlProps<T>) {
    return (
        <div
            className={styles.root}
            role='tablist'
            aria-label={ariaLabel}
            style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
        >
            {options.map((option) => {
                const active = option.value === value;
                return (
                    <button
                        key={option.value}
                        type='button'
                        role='tab'
                        aria-selected={active}
                        className={`${styles.option} ${active ? styles.optionActive : styles.optionInactive}`}
                        onClick={() => onChange(option.value)}
                    >
                        {option.label}
                    </button>
                );
            })}
        </div>
    );
}
