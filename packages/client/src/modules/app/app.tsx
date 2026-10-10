import { Spinner } from '@client/components/spinner';
import { AppShell } from '@client/modules/app-shell';
import { ToastProvider } from '@client/modules/toast';
import { Suspense, lazy } from 'react';
import { IntlProvider } from 'react-intl';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

const WorkspacePage = lazy(() => import('@client/pages/workspace-page').then((m) => ({ default: m.WorkspacePage })));
const SessionPage = lazy(() => import('@client/pages/session-page').then((m) => ({ default: m.SessionPage })));
const SettingsPage = lazy(() => import('@client/pages/settings-page').then((m) => ({ default: m.SettingsPage })));
const NewSessionPage = lazy(() =>
    import('@client/pages/new-session-page').then((m) => ({ default: m.NewSessionPage })),
);

export function App() {
    return (
        <IntlProvider locale='en' defaultLocale='en'>
            <BrowserRouter>
                <ToastProvider>
                    <Suspense fallback={<Spinner size='lg' label='Loading' />}>
                        <Routes>
                            <Route element={<AppShell />}>
                                <Route path='/' element={<WorkspacePage />} />
                                <Route path='/sessions/:sessionId' element={<SessionPage />} />
                                <Route path='/settings' element={<SettingsPage />} />
                                <Route path='/new-session' element={<NewSessionPage />} />
                            </Route>
                        </Routes>
                    </Suspense>
                </ToastProvider>
            </BrowserRouter>
        </IntlProvider>
    );
}
