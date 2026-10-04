import { styles } from './iconButton.styles';
import type { IconButtonProps } from './iconButton.types';

export function IconButton({ label, children, onClick, disabled, type = 'button' }: IconButtonProps) {
    return (
        <button type={type} className={styles.button} onClick={onClick} disabled={disabled} aria-label={label}>
            {children}
        </button>
    );
}
