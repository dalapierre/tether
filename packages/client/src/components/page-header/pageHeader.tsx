import logoLight from '@client/assets/logo_light.svg';
import { IconButton } from '@client/components/icon-button';
import { useSettings } from '@client/modules/settings/settingsContext';
import { Fragment } from 'react';
import { useIntl } from 'react-intl';
import { Link } from 'react-router-dom';
import { messages } from './pageHeader.messages';
import { styles } from './pageHeader.styles';
import type { PageHeaderProps } from './pageHeader.types';

function SettingsIcon() {
    return (
        <svg
            className={styles.settingsIcon}
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='1.75'
            aria-hidden='true'
        >
            <path
                strokeLinecap='round'
                strokeLinejoin='round'
                d='M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065'
            />
            <path strokeLinecap='round' strokeLinejoin='round' d='M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0' />
        </svg>
    );
}

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

export function PageHeader({
    title,
    crumbs = [],
    actions,
    showSettings = true,
    showLogo = true,
    onBack,
}: PageHeaderProps) {
    const intl = useIntl();
    const { openSettings } = useSettings();

    return (
        <header className={styles.header}>
            <div className={styles.start}>
                {showLogo ? (
                    <div className={styles.logo} aria-label={intl.formatMessage(messages.logo)} role='img'>
                        <img className={styles.logoImage} src={logoLight} alt='' />
                    </div>
                ) : null}
                {onBack ? (
                    <IconButton label={intl.formatMessage(messages.back)} onClick={onBack}>
                        <BackIcon />
                    </IconButton>
                ) : null}
                {title != null ? <h1 className={styles.title}>{title}</h1> : null}
                {title == null && crumbs.length > 0 ? (
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
                                    ) : crumb.to ? (
                                        <Link to={crumb.to} className={styles.crumb} onClick={crumb.onClick}>
                                            {crumb.label}
                                        </Link>
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
                ) : null}
            </div>
            {actions || showSettings ? (
                <div className={styles.actions}>
                    {actions}
                    {showSettings ? (
                        <IconButton label={intl.formatMessage(messages.settings)} onClick={openSettings}>
                            <SettingsIcon />
                        </IconButton>
                    ) : null}
                </div>
            ) : null}
        </header>
    );
}
