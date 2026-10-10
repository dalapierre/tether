import { styles } from './iconButton.styles';
import type { IconButtonProps } from './iconButton.types';

export function IconButton({
    label,
    children,
    onClick,
    disabled,
    type = 'button',
    pressed,
    className,
}: IconButtonProps) {
    return (
        <button
            type={type}
            className={`${styles.button}${pressed ? ` ${styles.pressed}` : ''}${className ? ` ${className}` : ''}`}
            onClick={onClick}
            disabled={disabled}
            title={label}
            aria-label={label}
            aria-pressed={pressed}
        >
            {children}
        </button>
    );
}
