import { styles } from './spinner.styles';
import type { SpinnerProps } from './spinner.types';

export function Spinner({ className, size = 'default', label }: SpinnerProps) {
    const sizeClass = size === 'lg' ? styles.lg : '';
    return (
        <div
            className={className ?? 'flex flex-1 items-center justify-center'}
            role='status'
            aria-live='polite'
            aria-busy='true'
            aria-label={label}
        >
            <span className={`${styles.root} ${sizeClass}`.trim()} aria-hidden='true' />
        </div>
    );
}
