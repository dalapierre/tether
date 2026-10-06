import { Spinner } from '@client/components/spinner';
import { AppShell } from '@client/modules/app-shell';
import { RequireAuth } from '@client/modules/auth/require-auth';
import { ToastProvider } from '@client/modules/toast';
import { Suspense, lazy } from 'react';
import { IntlProvider } from 'react-intl';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

const HomePage = lazy(() => import('@client/pages/home-page').then((m) => ({ default: m.HomePage })));
const LoginPage = lazy(() => import('@client/pages/login-page').then((m) => ({ default: m.LoginPage })));
const SessionPage = lazy(() => import('@client/pages/session-page').then((m) => ({ default: m.SessionPage })));

export function App() {
    return (
        <IntlProvider locale='en' defaultLocale='en'>
            <BrowserRouter>
                <ToastProvider>
                    <Suspense fallback={<Spinner size='lg' label='Loading' />}>
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
                                <Route path='/sessions/:sessionId' element={<SessionPage />} />
                            </Route>
                        </Routes>
                    </Suspense>
                </ToastProvider>
            </BrowserRouter>
        </IntlProvider>
    );
}
