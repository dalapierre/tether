import { AppMenu } from '@client/modules/app-menu';
import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { styles } from './pageHeader.styles';
import type { PageHeaderProps } from './pageHeader.types';

export function PageHeader({ crumbs, actions }: PageHeaderProps) {
    return (
        <header className={styles.header}>
            <div className={styles.start}>
                <AppMenu />
                <nav className={styles.crumbs} aria-label='Breadcrumb'>
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
            </div>
            {actions ? <div className={styles.actions}>{actions}</div> : null}
        </header>
    );
}
