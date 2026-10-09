import { Panel } from '@client/components/panel';
import { Fragment } from 'react';
import { useIntl } from 'react-intl';
import { messages } from './routePanel.messages';
import { styles } from './routePanel.styles';
import type { RoutePanelProps } from './routePanel.types';

function BackIcon() {
    return (
        <svg
            className={styles.backIcon}
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            aria-hidden='true'
        >
            <path strokeLinecap='round' strokeLinejoin='round' d='M15.75 19.5 8.25 12l7.5-7.5' />
        </svg>
    );
}

function RoutePanelCrumbs({ crumbs }: { crumbs: NonNullable<RoutePanelProps['crumbs']> }) {
    const intl = useIntl();

    return (
        <nav className={styles.crumbs} aria-label={intl.formatMessage(messages.breadcrumb)}>
            {crumbs.map((crumb, index) => {
                const isLast = index === crumbs.length - 1;
                const key = `${crumb.label}-${index}`;

                return (
                    <Fragment key={key}>
                        {index > 0 ? (
                            <span className={styles.separator} aria-hidden='true'>
                                ›
                            </span>
                        ) : null}
                        {isLast ? (
                            <span className={styles.crumbCurrent} aria-current='page'>
                                {crumb.label}
                            </span>
                        ) : crumb.onClick ? (
                            <button type='button' className={styles.crumbButton} onClick={crumb.onClick}>
                                {crumb.label}
                            </button>
                        ) : (
                            <span className={styles.crumb}>{crumb.label}</span>
                        )}
                    </Fragment>
                );
            })}
        </nav>
    );
}

export function RoutePanel({
    children,
    title,
    crumbs,
    onClose,
    closeLabel,
    closeDisabled,
    onBack,
    backLabel,
    toolbarLeading,
    footer,
    overlay,
    className,
    'aria-label': ariaLabel,
}: RoutePanelProps) {
    const intl = useIntl();
    const toolbarTitle = crumbs && crumbs.length > 0 ? <RoutePanelCrumbs crumbs={crumbs} /> : title;
    const leading =
        toolbarLeading ??
        (onBack ? (
            <button
                type='button'
                className={styles.backButton}
                aria-label={backLabel ?? intl.formatMessage(messages.back)}
                onClick={onBack}
            >
                <BackIcon />
            </button>
        ) : undefined);

    return (
        <div className={`${styles.root}${className ? ` ${className}` : ''}`}>
            <Panel
                className={styles.panel}
                title={toolbarTitle}
                toolbarLeading={leading}
                toolbarActions={
                    <button
                        type='button'
                        className={styles.closeButton}
                        aria-label={closeLabel}
                        disabled={closeDisabled}
                        onClick={onClose}
                    >
                        ×
                    </button>
                }
                aria-label={ariaLabel}
            >
                <div className={styles.shell} inert={overlay ? true : undefined}>
                    <div className={styles.body}>{children}</div>
                    {footer ?? null}
                </div>
            </Panel>
            {overlay}
        </div>
    );
}
