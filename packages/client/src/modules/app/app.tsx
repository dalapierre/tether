import { AppShell } from '@client/modules/app-shell';
import { RequireAuth } from '@client/modules/auth/require-auth';
import { ToastProvider } from '@client/modules/toast';
import { HomePage } from '@client/pages/home-page';
import { LoginPage } from '@client/pages/login-page';
import { ProjectPage } from '@client/pages/project-page';
import { SessionPage } from '@client/pages/session-page';
import { IntlProvider } from 'react-intl';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

export function App() {
    return (
        <IntlProvider locale='en' defaultLocale='en'>
            <BrowserRouter>
                <ToastProvider>
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
                            <Route path='/projects/:slug' element={<ProjectPage />} />
                            <Route path='/projects/:slug/sessions/:sessionId' element={<SessionPage />} />
                        </Route>
                    </Routes>
                </ToastProvider>
            </BrowserRouter>
        </IntlProvider>
    );
}
