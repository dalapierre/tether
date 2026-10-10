import { styles } from './paneToolbar.styles';
import type { PaneToolbarProps } from './paneToolbar.types';

export function PaneToolbar({ title, leading, children, className }: PaneToolbarProps) {
    return (
        <div className={`${styles.root}${className ? ` ${className}` : ''}`}>
            {leading}
            <div className={styles.title}>
                {typeof title === 'string' || typeof title === 'number' ? (
                    <span className={styles.titleText}>{title}</span>
                ) : (
                    title
                )}
            </div>
            {children}
        </div>
    );
}
