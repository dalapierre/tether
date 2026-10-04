import { RequireAuth } from '@client/modules/auth/require-auth';
import HomePage from '@client/pages/homePage';
import { LoginPage } from '@client/pages/login-page';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

export function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path='/login' element={<LoginPage />} />
                <Route
                    path='/'
                    element={
                        <RequireAuth>
                            <HomePage />
                        </RequireAuth>
                    }
                />
            </Routes>
        </BrowserRouter>
    );
}
