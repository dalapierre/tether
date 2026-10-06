import { useEffect, type ReactNode } from 'react';
import { ensureSessionEventsStarted } from './sessionEventsConnection';

export function SessionEventsProvider({ children }: { children: ReactNode }) {
    useEffect(() => {
        ensureSessionEventsStarted();
    }, []);

    return children;
}
