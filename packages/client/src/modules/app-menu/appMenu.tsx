import { useEffect, useId, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { styles } from './appMenu.styles';

function MenuIcon() {
    return (
        <svg
            className={styles.menuIcon}
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='1.75'
            aria-hidden='true'
        >
            <path strokeLinecap='round' d='M4 7h16M4 12h16M4 17h16' />
        </svg>
    );
}

export function AppMenu() {
    const [open, setOpen] = useState(false);
    const panelId = useId();

    useEffect(() => {
        if (!open) return;

        function onKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                setOpen(false);
            }
        }

        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [open]);

    function close() {
        setOpen(false);
    }

    return (
        <>
            <button
                type='button'
                className={styles.menuButton}
                aria-label='Open menu'
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpen(true)}
            >
                <MenuIcon />
            </button>

            {open ? (
                <>
                    <button type='button' className={styles.overlay} aria-label='Close menu' onClick={close} />
                    <div id={panelId} className={styles.panel} role='dialog' aria-modal='true' aria-label='Main menu'>
                        <div className={styles.panelHeader}>
                            <p className={styles.panelTitle}>Menu</p>
                            <button
                                type='button'
                                className={styles.closeButton}
                                aria-label='Close menu'
                                onClick={close}
                            >
                                ×
                            </button>
                        </div>
                        <nav className={styles.nav} aria-label='Main'>
                            <NavLink
                                to='/'
                                end
                                className={({ isActive }) => (isActive ? styles.itemActive : styles.item)}
                                onClick={close}
                            >
                                Home
                            </NavLink>
                            <NavLink
                                to='/settings'
                                className={({ isActive }) => (isActive ? styles.itemActive : styles.item)}
                                onClick={close}
                            >
                                Settings
                            </NavLink>
                        </nav>
                    </div>
                </>
            ) : null}
        </>
    );
}
