import { isAuthenticated } from '@client/libs/auth/session';
import { Navigate, useLocation } from 'react-router-dom';
import type { RequireAuthProps } from './requireAuth.types';

export function RequireAuth({ children }: RequireAuthProps) {
    const location = useLocation();

    if (!isAuthenticated()) {
        return <Navigate to='/login' replace state={{ from: location.pathname }} />;
    }

    return children;
}
