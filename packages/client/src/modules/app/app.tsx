import { RequireAuth } from '@client/modules/auth/require-auth';
import { HomePage } from '@client/pages/home-page';
import { LoginPage } from '@client/pages/login-page';
import { ProjectPage } from '@client/pages/project-page';
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
                <Route
                    path='/projects/:id'
                    element={
                        <RequireAuth>
                            <ProjectPage />
                        </RequireAuth>
                    }
                />
            </Routes>
        </BrowserRouter>
    );
}
