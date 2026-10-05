import { useEffect, useState } from 'react';

/** Tailwind `md` breakpoint — phone layouts below this, desktop enhancements at/above. */
export const DESKTOP_MEDIA_QUERY = '(min-width: 768px)';

export function useMediaQuery(query: string): boolean {
    const [matches, setMatches] = useState(() => {
        if (typeof window === 'undefined') return false;
        return window.matchMedia(query).matches;
    });

    useEffect(() => {
        const media = window.matchMedia(query);
        const onChange = () => setMatches(media.matches);
        onChange();
        media.addEventListener('change', onChange);
        return () => media.removeEventListener('change', onChange);
    }, [query]);

    return matches;
}

export function useIsDesktop(): boolean {
    return useMediaQuery(DESKTOP_MEDIA_QUERY);
}
