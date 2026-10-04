import { styles } from './card.styles';
import type { CardProps } from './card.types';

export function Card({ title, children, onClick }: CardProps) {
    return (
        <button type='button' className={styles.button} onClick={onClick}>
            <span className={styles.title}>{title}</span>
            {children ? <div className={styles.body}>{children}</div> : null}
        </button>
    );
}
