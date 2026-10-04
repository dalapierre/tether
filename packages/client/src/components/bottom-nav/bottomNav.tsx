import { NavLink } from 'react-router-dom';
import { styles } from './bottomNav.styles';

function HomeIcon() {
    return (
        <svg
            className={styles.icon}
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='1.75'
            aria-hidden='true'
        >
            <path
                strokeLinecap='round'
                strokeLinejoin='round'
                d='M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5.5v-6h-5v6H4a1 1 0 0 1-1-1v-9.5z'
            />
        </svg>
    );
}

function SettingsIcon() {
    return (
        <svg
            className={styles.icon}
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='1.75'
            aria-hidden='true'
        >
            <path
                strokeLinecap='round'
                strokeLinejoin='round'
                d='M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z'
            />
            <path strokeLinecap='round' strokeLinejoin='round' d='M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z' />
        </svg>
    );
}

export function BottomNav() {
    return (
        <nav className={styles.nav} aria-label='Main'>
            <NavLink
                to='/'
                end
                aria-label='Home'
                className={({ isActive }) => (isActive ? styles.itemActive : styles.item)}
            >
                <HomeIcon />
            </NavLink>
            <NavLink
                to='/settings'
                aria-label='Settings'
                className={({ isActive }) => (isActive ? styles.itemActive : styles.item)}
            >
                <SettingsIcon />
            </NavLink>
        </nav>
    );
}
