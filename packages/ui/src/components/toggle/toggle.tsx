import { styles } from './toggle.styles';
import type { ToggleProps } from './toggle.types';

export function Toggle({ label, description, checked, disabled, onChange }: ToggleProps) {
    return (
        <button
            type='button'
            className={styles.root}
            role='switch'
            aria-checked={checked}
            disabled={disabled}
            onClick={() => onChange(!checked)}
        >
            <span className={styles.text}>
                <span className={styles.label}>{label}</span>
                {description ? <span className={styles.description}>{description}</span> : null}
            </span>
            <span className={`${styles.track} ${checked ? styles.trackOn : styles.trackOff}`} aria-hidden='true'>
                <span className={`${styles.thumb} ${checked ? styles.thumbOn : styles.thumbOff}`} />
            </span>
        </button>
    );
}
