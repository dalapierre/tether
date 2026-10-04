import { AppShell } from '@client/modules/app-shell';
import { RequireAuth } from '@client/modules/auth/require-auth';
import { HomePage } from '@client/pages/home-page';
import { LoginPage } from '@client/pages/login-page';
import { ProjectPage } from '@client/pages/project-page';
import { SettingsPage } from '@client/pages/settings-page';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

export function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path='/login' element={<LoginPage />} />
                <Route
                    element={
                        <RequireAuth>
                            <AppShell />
                        </RequireAuth>
                    }
                >
                    <Route path='/' element={<HomePage />} />
                    <Route path='/projects/:id' element={<ProjectPage />} />
                    <Route path='/settings' element={<SettingsPage />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}
