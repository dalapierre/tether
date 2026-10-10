import { styles } from './button.styles';
import type { ButtonProps } from './button.types';

export function Button({
    children,
    variant = 'primary',
    type = 'button',
    disabled,
    fullWidth = true,
    onClick,
}: ButtonProps) {
    return (
        <button type={type} className={styles.variant(variant, fullWidth)} disabled={disabled} onClick={onClick}>
            {children}
        </button>
    );
}
