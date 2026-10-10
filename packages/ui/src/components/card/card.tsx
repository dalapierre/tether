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

function RestartIcon() {
    return (
        <svg
            className={styles.restartIcon}
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            aria-hidden='true'
        >
            <path
                strokeLinecap='round'
                strokeLinejoin='round'
                d='M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182'
            />
        </svg>
    );
}

export function Card({
    title,
    children,
    onClick,
    indicator,
    selected,
    onRestart,
    restartLabel,
    restartDisabled,
}: CardProps) {
    const showRestart = Boolean(onRestart);
    const buttonClass = selected
        ? showRestart
            ? styles.buttonSelectedWithRestart
            : styles.buttonSelected
        : showRestart
          ? styles.buttonWithRestart
          : styles.button;

    return (
        <div className={styles.root}>
            <button type='button' className={buttonClass} onClick={onClick}>
                <span className={styles.title}>{title}</span>
                {children ? <div className={styles.body}>{children}</div> : null}
            </button>
            {showRestart || indicator ? (
                <div className={styles.trailing}>
                    {onRestart ? (
                        <button
                            type='button'
                            className={styles.restartButton}
                            aria-label={restartLabel}
                            disabled={restartDisabled}
                            onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                onRestart();
                            }}
                        >
                            <RestartIcon />
                        </button>
                    ) : null}
                    {indicator ? (
                        <span className={`${styles.indicator} ${indicatorClass(indicator)}`} aria-hidden='true' />
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}
