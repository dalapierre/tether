import { styles } from './card.styles';
import type { CardIndicator, CardProps } from './card.types';

function indicatorClass(indicator: CardIndicator): string {
    switch (indicator) {
        case 'ready':
            return styles.indicatorReady;
        case 'busy':
            return styles.indicatorBusy;
        case 'error':
            return styles.indicatorError;
    }
}

export function Card({ title, children, onClick, indicator, selected }: CardProps) {
    return (
        <button type='button' className={selected ? styles.buttonSelected : styles.button} onClick={onClick}>
            {indicator ? (
                <span className={`${styles.indicator} ${indicatorClass(indicator)}`} aria-hidden='true' />
            ) : null}
            <span className={styles.title}>{title}</span>
            {children ? <div className={styles.body}>{children}</div> : null}
        </button>
    );
}
